const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

test("complete employer HTTP flow persists data and enforces tenant boundaries", async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "welx-http-test-"));
  process.env.NODE_ENV = "test";
  process.env.USE_LOCAL_FILE_DB = "true";
  process.env.LOCAL_USER_DB_PATH = path.join(temporaryDirectory, "users.json");
  process.env.LOCAL_EMPLOYER_DB_PATH = path.join(temporaryDirectory, "employer.json");
  process.env.JWT_SECRET = "welx-http-test-secret";

  const { app } = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  async function request(endpoint, { method = "GET", token, body } = {}) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  const employerSignup = await request("/auth/signup", { method: "POST", body: { name: "Aisha Manager", email: "manager@integration.test", password: "secret123", role: "employer", company: "Integration Labs" } });
  assert.equal(employerSignup.status, 201);
  assert.equal(employerSignup.data.user.role, "employer");
  assert.equal(employerSignup.data.user.company, "Integration Labs");
  const employerToken = employerSignup.data.token;

  const login = await request("/auth/login", { method: "POST", body: { email: "manager@integration.test", password: "secret123" } });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.role, "employer");

  const studentSignup = await request("/auth/signup", { method: "POST", body: { name: "Student User", email: "student@integration.test", password: "secret123", role: "student" } });
  assert.equal(studentSignup.status, 201);
  assert.equal((await request("/employees", { token: studentSignup.data.token })).status, 403);
  const onboarding = await request("/onboarding", { method: "POST", token: studentSignup.data.token, body: { onboardingData: { currentLevel: "Beginner", primaryGoal: "Career advancement", timeCommitment: "5–8 hours", education: "Bachelor's degree", workExperience: "0–2 years", targetRole: "Software Engineer", skillsToImprove: ["Programming", "Leadership"], startDate: "2026-09-01", completionTimeline: "3 months" } } });
  assert.equal(onboarding.status, 200);
  assert.equal(onboarding.data.user.onboardingComplete, true);
  assert.deepEqual(onboarding.data.user.onboardingData.skillsToImprove, ["Programming", "Leadership"]);
  const studentLogin = await request("/auth/login", { method: "POST", body: { email: "student@integration.test", password: "secret123" } });
  assert.equal(studentLogin.data.user.onboardingComplete, true);
  assert.equal(studentLogin.data.user.onboardingData.targetRole, "Software Engineer");

  const invalidPassword = await request("/employees", { method: "POST", token: employerToken, body: { name: "Invalid Password", email: "invalid.password@integration.test", password: "short", department: "Engineering" } });
  assert.equal(invalidPassword.status, 400);
  const created = await request("/employees", { method: "POST", token: employerToken, body: { name: "Fatima Developer", email: "fatima@integration.test", password: "Fatima123!", designation: "Developer", department: "Engineering", skills: ["React", "Node.js"] } });
  assert.equal(created.status, 201);
  const employeeId = created.data.employee.id;
  const employeeLogin = await request("/auth/login", { method: "POST", body: { email: "fatima@integration.test", password: "Fatima123!" } });
  assert.equal(employeeLogin.status, 200);
  assert.equal(employeeLogin.data.user.role, "employee");

  const invalidInvitation = await request("/employees/invitations", { method: "POST", token: employerToken, body: { emails: ["not-an-email"], message: "Welcome" } });
  assert.equal(invalidInvitation.status, 400);
  const invitations = await request("/employees/invitations", { method: "POST", token: employerToken, body: { emails: ["invite.one@integration.test", "invite.two@integration.test"], message: "Welcome to Integration Labs" } });
  assert.equal(invitations.status, 201);
  assert.equal(invitations.data.employees.length, 2);

  const bulk = await request("/employees/bulk", { method: "POST", token: employerToken, body: { employees: [{ name: "Bulk Person", email: "bulk@integration.test", designation: "Analyst", department: "Data Science", skills: "Python" }] } });
  assert.equal(bulk.status, 201);
  assert.equal(bulk.data.employees.length, 1);

  const catalog = await request("/employees/assignable-courses", { token: employerToken });
  assert.equal(catalog.status, 200);
  assert.ok(catalog.data.length >= 3);

  const assignment = await request(`/employees/${employeeId}/assign-courses`, { method: "POST", token: employerToken, body: { courseIds: [catalog.data[0]._id] } });
  const duplicate = await request(`/employees/${employeeId}/assign-courses`, { method: "POST", token: employerToken, body: { courseIds: [catalog.data[0]._id] } });
  assert.equal(assignment.data.assigned, 1);
  assert.equal(duplicate.data.assigned, 0);

  const bundles = await request("/employees/assign-bundles", { method: "POST", token: employerToken, body: { employeeIds: [employeeId, bulk.data.employees[0].id], courseIds: [catalog.data[1]._id, catalog.data[2]._id] } });
  assert.equal(bundles.status, 200);
  assert.equal(bundles.data.assignmentsCreated, 4);

  const filtered = await request("/employees?q=fatima&department=engineering&status=invited", { token: employerToken });
  assert.equal(filtered.status, 200);
  assert.equal(filtered.data.length, 1);

  const summary = await request("/employees/summary", { token: employerToken });
  const activity = await request("/employees/activity", { token: employerToken });
  assert.equal(summary.data.metrics.totalEmployees, 4);
  assert.ok(summary.data.departmentProgress.length >= 2);
  assert.ok(activity.data.some((event) => event.type === "course_assigned"));

  const otherEmployer = await request("/auth/signup", { method: "POST", body: { name: "Other Manager", email: "other@integration.test", password: "secret123", role: "employer", company: "Other Co" } });
  const otherToken = otherEmployer.data.token;
  const otherList = await request("/employees", { token: otherToken });
  const crossTenantProfile = await request(`/employees/${employeeId}`, { token: otherToken });
  assert.deepEqual(otherList.data, []);
  assert.equal(crossTenantProfile.status, 404);
});
