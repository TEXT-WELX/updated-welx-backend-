const userRepository = require("../repositories/userRepository");

const BADGES = [
  { name: "Bronze Explorer", points: 100 },
  { name: "Silver Strategist", points: 500 },
  { name: "Gold Master", points: 1000 },
  { name: "Platinum Legend", points: 2500 },
  { name: "Diamond Elite", points: 5000 },
];

const ACTIONS = {
  coding_project_saved: { points: 40, label: "Saved a coding project" },
  coding_challenge_completed: { points: 30, label: "Completed a coding challenge" },
  lesson_completed: { points: 15, label: "Completed a course lesson" },
  course_completed: { points: 150, label: "Completed a course" },
  quiz_passed: { points: 50, label: "Passed a course quiz" },
};

function pointsForAction(action, metadata = {}) {
  if (action === "simulation_completed") {
    const score = Math.max(0, Math.min(100, Number(metadata.score || 0)));
    if (score < 70) return { points: 0, label: "Completed a simulation" };
    return { points: Math.round(score * 0.8) + (score >= 90 ? 50 : 0), label: "Completed a simulation" };
  }
  return ACTIONS[action] || null;
}

function withBadge(summary) {
  const points = Number(summary?.points || 0);
  const badge = [...BADGES].reverse().find((item) => points >= item.points) || null;
  const nextBadge = BADGES.find((item) => points < item.points) || null;
  return { ...summary, points, badge, nextBadge };
}

async function getPointsSummary(userId) {
  const summary = await userRepository.getPoints(userId);
  return summary ? withBadge(summary) : null;
}

async function awardUserPoints(userId, { action, eventId, metadata = {} }) {
  const rule = pointsForAction(action, metadata);
  if (!rule) {
    const error = new Error("Unknown WELX points action");
    error.status = 400;
    throw error;
  }
  if (typeof eventId !== "string" || eventId.trim().length < 4 || eventId.length > 180) {
    const error = new Error("A valid points event ID is required");
    error.status = 400;
    throw error;
  }
  if (rule.points <= 0) return { ...(await getPointsSummary(userId)), awarded: 0, activity: null };
  const result = await userRepository.awardPoints(userId, {
    eventId: eventId.trim(),
    type: action,
    label: rule.label,
    points: rule.points,
    metadata,
    createdAt: new Date(),
  });
  return result ? withBadge({ ...result, activities: (await userRepository.getPoints(userId)).activities }) : null;
}

module.exports = { BADGES, pointsForAction, getPointsSummary, awardUserPoints };
