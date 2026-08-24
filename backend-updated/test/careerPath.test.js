const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCareerPath } = require("../src/services/careerPath");
const { calculatePurchase } = require("../src/services/purchasePricing");

const courses = [
  { _id: "1", title: "JavaScript Foundations", category: "Programming", level: "Beginner", duration: "4 weeks", price: 100, skills: ["Programming"], rating: 4.8 },
  { _id: "2", title: "React Applications", category: "Web Development", level: "Intermediate", duration: "5 weeks", price: 150, skills: ["Web Development"], rating: 4.7 },
  { _id: "3", title: "Technology Leadership", category: "Business", level: "Advanced", duration: "3 weeks", price: 200, skills: ["Leadership"], rating: 4.6 },
  { _id: "4", title: "Finance for Managers", category: "Finance", level: "Intermediate", duration: "3 weeks", price: 120, skills: ["Finance"], rating: 4.5 },
];

test("career paths use only marketplace courses and unlock phases in sequence", () => {
  const onboarding = { targetRole: "Software Engineer", skillsToImprove: ["Programming", "Leadership"], startDate: "2026-09-01", completionTimeline: "3 months" };
  const path = buildCareerPath({ courses, onboarding, enrollments: [{ courseId: "1", progress: 100 }] });
  assert.equal(path.phases.length, 3);
  assert.equal(path.phases[0].complete, true);
  assert.equal(path.phases[1].unlocked, true);
  assert.equal(path.phases[2].unlocked, false);
  assert.ok(path.phases.flatMap((phase) => phase.courses).every((course) => courses.some((source) => source._id === course._id)));
});

test("custom phases are capped by the controller contract and preserve selected marketplace IDs", () => {
  const onboarding = { targetRole: "Software Engineer", skillsToImprove: ["Programming"], careerPath: { phases: { "skill-building": { courseIds: ["2", "4"] } } } };
  const path = buildCareerPath({ courses, onboarding, enrollments: [] });
  assert.deepEqual(path.phases[1].courses.map((course) => course._id), ["2", "4"]);
  assert.equal(path.phases[1].customized, true);
});

test("the 20 percent discount applies only to a multi-course phase bundle", () => {
  assert.deepEqual(calculatePurchase(courses.slice(0, 2), "phase_bundle"), { subtotal: 250, discountPercent: 20, total: 200, amountInFils: 20000 });
  assert.equal(calculatePurchase(courses.slice(0, 1), "phase_bundle").discountPercent, 0);
  assert.equal(calculatePurchase(courses.slice(0, 1), "single").total, 100);
});
