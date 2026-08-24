const test = require("node:test");
const assert = require("node:assert/strict");
const { pointsForAction } = require("../src/services/welxPoints");

test("WELX points rules are server controlled", () => {
  assert.equal(pointsForAction("coding_project_saved").points, 40);
  assert.equal(pointsForAction("course_completed").points, 150);
  assert.equal(pointsForAction("simulation_completed", { score: 90 }).points, 122);
  assert.equal(pointsForAction("simulation_completed", { score: 69 }).points, 0);
  assert.equal(pointsForAction("unknown"), null);
});
