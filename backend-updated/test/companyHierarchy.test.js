const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

test("company heads manage teams while leaders are restricted to their own members", async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "welx-company-hierarchy-"));
  process.env.NODE_ENV = "test";
  process.env.USE_LOCAL_FILE_DB = "true";
  process.env.LOCAL_USER_DB_PATH = path.join(temporaryDirectory, "users.json");
  process.env.LOCAL_EMPLOYER_DB_PATH = path.join(temporaryDirectory, "company.json");
  process.env.JWT_SECRET = "welx-company-hierarchy-secret";

  const { app } = require("../server");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

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
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    return { status: response.status, data };
  }

  async function signup(name, email, role, company) {
    return request("/auth/signup", { method: "POST", body: { name, email, password: "secret123", role, ...(company ? { company } : {}) } });
  }

  const employer = await signup("Taylor Acquisition", "head@hierarchy.test", "employer", "Hierarchy Labs");
  const employerToken = employer.data.token;
  await signup("Erin Leader", "engineering.lead@hierarchy.test", "employee");
  await signup("Mark Leader", "marketing.lead@hierarchy.test", "employee");
  await signup("Dev Member", "developer@hierarchy.test", "employee");
  await signup("Marketing Member", "marketer@hierarchy.test", "employee");

  const engineering = await request("/company/teams", { method: "POST", token: employerToken, body: { name: "Platform Engineering", department: "Engineering", description: "Product delivery" } });
  const marketing = await request("/company/teams", { method: "POST", token: employerToken, body: { name: "Growth Marketing", department: "Marketing" } });
  assert.equal(engineering.status, 201);
  assert.equal(marketing.status, 201);

  const engineeringId = engineering.data.team.id;
  const marketingId = marketing.data.team.id;
  const weakLeaderPassword = await request(`/company/teams/${engineeringId}/leader`, { method: "PUT", token: employerToken, body: { name: "Erin Leader", email: "engineering.lead@hierarchy.test", password: "weak" } });
  assert.equal(weakLeaderPassword.status, 400);
  const promoted = await request(`/company/teams/${engineeringId}/leader`, { method: "PUT", token: employerToken, body: { name: "Erin Leader", email: "engineering.lead@hierarchy.test", password: "Leader123!", designation: "Engineering Manager" } });
  await request(`/company/teams/${marketingId}/leader`, { method: "PUT", token: employerToken, body: { name: "Mark Leader", email: "marketing.lead@hierarchy.test", password: "Marketing123!" } });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.data.employee.organizationRole, "team_leader");
  assert.equal(promoted.data.notification.status, "queued");

  assert.equal((await request("/auth/login", { method: "POST", body: { email: "engineering.lead@hierarchy.test", password: "secret123" } })).status, 400);
  const leaderLogin = await request("/auth/login", { method: "POST", body: { email: "engineering.lead@hierarchy.test", password: "Leader123!" } });
  const marketingLeaderLogin = await request("/auth/login", { method: "POST", body: { email: "marketing.lead@hierarchy.test", password: "Marketing123!" } });
  assert.equal(leaderLogin.data.user.role, "employee");
  assert.equal(leaderLogin.data.user.companyAccess.accessRole, "team_leader");
  assert.equal(leaderLogin.data.user.companyAccess.teamId, engineeringId);

  const engineeringMember = await request(`/company/teams/${engineeringId}/members`, { method: "POST", token: leaderLogin.data.token, body: { name: "Dev Member", email: "developer@hierarchy.test", password: "Developer123!", designation: "Developer" } });
  const marketingMember = await request(`/company/teams/${marketingId}/members`, { method: "POST", token: marketingLeaderLogin.data.token, body: { name: "Marketing Member", email: "marketer@hierarchy.test", password: "Marketer123!", designation: "Campaign Manager" } });
  assert.equal(engineeringMember.status, 201);
  assert.equal(marketingMember.status, 201);
  assert.equal(engineeringMember.data.notification.status, "queued");

  const crossTeamOnboard = await request(`/company/teams/${marketingId}/members`, { method: "POST", token: leaderLogin.data.token, body: { name: "Wrong Team", email: "wrong@hierarchy.test" } });
  assert.equal(crossTeamOnboard.status, 403);
  assert.equal((await request("/company/teams", { token: leaderLogin.data.token })).status, 403);

  const leaderDashboard = await request("/company/leader-dashboard", { token: leaderLogin.data.token });
  assert.equal(leaderDashboard.status, 200);
  assert.equal(leaderDashboard.data.team.id, engineeringId);
  assert.deepEqual(leaderDashboard.data.employees.map((employee) => employee.email), ["developer@hierarchy.test"]);

  const leaderEmployeeList = await request("/employees", { token: leaderLogin.data.token });
  assert.deepEqual(leaderEmployeeList.data.map((employee) => employee.email), ["developer@hierarchy.test"]);

  const catalog = await request("/employees/assignable-courses", { token: leaderLogin.data.token });
  const assignment = await request(`/employees/${engineeringMember.data.employee.id}/assign-courses`, { method: "POST", token: leaderLogin.data.token, body: { courseIds: [catalog.data[0]._id] } });
  const crossTeamAssignment = await request(`/employees/${marketingMember.data.employee.id}/assign-courses`, { method: "POST", token: leaderLogin.data.token, body: { courseIds: [catalog.data[0]._id] } });
  assert.equal(assignment.status, 200);
  assert.equal(assignment.data.assigned, 1);
  assert.equal(crossTeamAssignment.status, 404);

  const memberLogin = await request("/auth/login", { method: "POST", body: { email: "developer@hierarchy.test", password: "Developer123!" } });
  assert.equal(memberLogin.data.user.companyAccess.accessRole, "team_member");
  assert.equal((await request("/employees", { token: memberLogin.data.token })).status, 403);
  const memberProfile = await request("/company/me", { token: memberLogin.data.token });
  assert.equal(memberProfile.data.employee.email, "developer@hierarchy.test");
  assert.equal(memberProfile.data.team.id, engineeringId);

  const dashboard = await request("/company/dashboard", { token: employerToken });
  assert.equal(dashboard.data.companyMetrics.totalTeams, 2);
  assert.equal(dashboard.data.companyMetrics.teamLeaders, 2);
  assert.equal(dashboard.data.companyMetrics.teamMembers, 2);

  const report = await request("/company/report", { token: employerToken });
  assert.equal(report.status, 200);
  assert.match(report.data, /developer@hierarchy\.test/);
  assert.match(report.data, /team_leader/);

  assert.equal((await request(`/employees/${engineeringMember.data.employee.id}`, { method: "DELETE", token: leaderLogin.data.token })).status, 403);
  const removedMember = await request(`/employees/${engineeringMember.data.employee.id}`, { method: "DELETE", token: employerToken });
  assert.equal(removedMember.status, 200);
  const removedMemberLogin = await request("/auth/login", { method: "POST", body: { email: "developer@hierarchy.test", password: "Developer123!" } });
  assert.equal(removedMemberLogin.status, 200);
  assert.equal(removedMemberLogin.data.user.companyAccess, null);

  const removedLeader = await request(`/employees/${promoted.data.employee.id}`, { method: "DELETE", token: employerToken });
  assert.equal(removedLeader.status, 200);
  const teamsAfterLeaderRemoval = await request("/company/teams", { token: employerToken });
  assert.equal(teamsAfterLeaderRemoval.data.teams.find((team) => team.id === engineeringId).leader, null);

  assert.equal((await request(`/company/teams/${engineeringId}`, { method: "DELETE", token: leaderLogin.data.token })).status, 403);
  assert.equal((await request(`/company/teams/${marketingId}`, { method: "DELETE", token: employerToken })).status, 200);
  const remainingTeams = await request("/company/teams", { token: employerToken });
  assert.equal(remainingTeams.data.metrics.totalTeams, 1);
});
