const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

test("employer data is isolated and duplicate course assignments are ignored", async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "welx-employer-test-"));
  const previousLocalFlag = process.env.USE_LOCAL_FILE_DB;
  const previousStorePath = process.env.LOCAL_EMPLOYER_DB_PATH;
  process.env.USE_LOCAL_FILE_DB = "true";
  process.env.LOCAL_EMPLOYER_DB_PATH = path.join(temporaryDirectory, "employer.json");

  context.after(async () => {
    if (previousLocalFlag === undefined) delete process.env.USE_LOCAL_FILE_DB;
    else process.env.USE_LOCAL_FILE_DB = previousLocalFlag;
    if (previousStorePath === undefined) delete process.env.LOCAL_EMPLOYER_DB_PATH;
    else process.env.LOCAL_EMPLOYER_DB_PATH = previousStorePath;
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  const repository = require("../src/repositories/employerRepository");
  const employee = await repository.createEmployee("employer-a", {
    name: "Aisha Learner",
    email: "aisha@example.com",
    department: "Engineering",
    designation: "Developer",
    skills: ["React", "Node.js"],
    status: "active",
  });

  assert.equal((await repository.listEmployees("employer-a")).length, 1);
  assert.equal((await repository.listEmployees("employer-b")).length, 0);
  assert.equal(await repository.getEmployee("employer-b", employee.id), null);

  const firstAssignment = await repository.assignCourses("employer-a", employee.id, ["local-course-1", "local-course-1"]);
  const duplicateAssignment = await repository.assignCourses("employer-a", employee.id, ["local-course-1"]);

  assert.equal(firstAssignment.assigned, 1);
  assert.equal(duplicateAssignment.assigned, 0);
  assert.equal(firstAssignment.employee.assignedCourses, 1);

  const summary = await repository.getDashboardSummary("employer-a");
  assert.equal(summary.metrics.totalEmployees, 1);
  assert.equal(summary.metrics.activeLearners, 1);
  assert.equal(summary.departmentProgress[0].assigned, 1);
  assert.ok(summary.recentActivity.some((activity) => activity.type === "course_assigned"));
});

test("the employer role guard rejects student access", () => {
  const requireRole = require("../src/middleware/requireRole");
  const middleware = requireRole("employer");
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;

  middleware({ user: { role: "student" } }, response, () => { nextCalled = true; });

  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});
