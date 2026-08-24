const PHASES = [
  { key: "foundation", title: "Foundation", description: "Build durable fundamentals and confidence.", level: "beginner", allocation: 0.3 },
  { key: "skill-building", title: "Skill Building", description: "Turn knowledge into practical capability.", level: "intermediate", allocation: 0.4 },
  { key: "specialization", title: "Specialization", description: "Apply advanced skills to your career direction.", level: "advanced", allocation: 0.3 },
];

const asText = (value) => String(value || "").trim().toLowerCase();
const courseId = (course) => String(course._id || course.id);
const durationWeeks = (course) => Number.parseInt(String(course.duration || "1"), 10) || 1;
const dateOnly = (date) => date.toISOString().slice(0, 10);

function scoreCourse(course, onboarding) {
  const interests = [onboarding.targetRole, ...(onboarding.skillsToImprove || [])].map(asText).filter(Boolean);
  const haystack = [course.title, course.description, course.category, ...(course.skills || []), ...(course.tags || [])].map(asText).join(" ");
  return interests.reduce((score, interest) => score + (haystack.includes(interest) ? 8 : interest.split(/\s+/).reduce((sum, word) => sum + (word.length > 3 && haystack.includes(word) ? 2 : 0), 0)), Number(course.rating || 0));
}

function phaseDates(startDate, timeline, index) {
  const months = { "1 month": 1, "3 months": 3, "6 months": 6, "1 year": 12 }[timeline] || 3;
  const start = new Date(startDate || Date.now());
  if (Number.isNaN(start.getTime())) start.setTime(Date.now());
  const totalDays = months * 30;
  const before = PHASES.slice(0, index).reduce((sum, item) => sum + item.allocation, 0);
  const phaseStart = new Date(start); phaseStart.setDate(start.getDate() + Math.round(totalDays * before));
  const due = new Date(phaseStart); due.setDate(phaseStart.getDate() + Math.round(totalDays * PHASES[index].allocation));
  return { startDate: dateOnly(phaseStart), dueDate: dateOnly(due) };
}

function serializeCourse(course, enrollment) {
  return {
    _id: courseId(course), title: course.title, description: course.description || "", category: course.category || "General",
    duration: course.duration || "Self paced", level: asText(course.level) || "beginner", price: Number(course.price || 0),
    rating: Number(course.rating || 0), image: course.image || "", instructor: course.instructor || "WEL.X faculty",
    skills: course.skills || [], enrolled: Boolean(enrollment), progress: Number(enrollment?.progress || 0), completed: Number(enrollment?.progress || 0) >= 100,
  };
}

function buildCareerPath({ courses, onboarding = {}, enrollments = [] }) {
  const enrollmentMap = new Map(enrollments.map((item) => [String(item.courseId), item]));
  const saved = onboarding.careerPath?.phases || {};
  const ranked = [...courses].sort((a, b) => scoreCourse(b, onboarding) - scoreCourse(a, onboarding));
  const used = new Set();
  const phases = PHASES.map((definition, index) => {
    const customIds = Array.isArray(saved[definition.key]?.courseIds) ? saved[definition.key].courseIds.map(String).slice(0, 3) : [];
    let picked = customIds.map((id) => courses.find((course) => courseId(course) === id)).filter(Boolean);
    if (!picked.length) {
      picked = ranked.filter((course) => !used.has(courseId(course)) && asText(course.level) === definition.level).slice(0, index === 2 ? 2 : 1);
      if (!picked.length) picked = ranked.filter((course) => !used.has(courseId(course))).slice(0, 1);
    }
    picked.forEach((course) => used.add(courseId(course)));
    const phaseCourses = picked.map((course) => serializeCourse(course, enrollmentMap.get(courseId(course))));
    const enrolled = phaseCourses.length > 0 && phaseCourses.every((course) => course.enrolled);
    const complete = phaseCourses.length > 0 && phaseCourses.every((course) => course.completed);
    const subtotal = phaseCourses.reduce((sum, course) => sum + course.price, 0);
    return { ...definition, ...phaseDates(onboarding.startDate, onboarding.completionTimeline, index), courses: phaseCourses, durationWeeks: phaseCourses.reduce((sum, course) => sum + durationWeeks(course), 0), customized: customIds.length > 0, enrolled, complete, subtotal, bundleDiscount: phaseCourses.length > 1 ? Math.round(subtotal * .2 * 100) / 100 : 0, bundlePrice: phaseCourses.length > 1 ? Math.round(subtotal * .8 * 100) / 100 : subtotal };
  });
  phases.forEach((phase, index) => { phase.unlocked = index === 0 || phases[index - 1].complete; phase.status = phase.complete ? "complete" : phase.unlocked ? "current" : "locked"; phase.progress = phase.courses.length ? Math.round(phase.courses.reduce((sum, course) => sum + course.progress, 0) / phase.courses.length) : 0; });
  const totalCourses = phases.reduce((sum, phase) => sum + phase.courses.length, 0);
  return { title: `Path to ${onboarding.targetRole || "your next role"}`, targetRole: onboarding.targetRole || "", timeline: onboarding.completionTimeline || "3 months", startDate: onboarding.startDate || dateOnly(new Date()), totalCourses, estimatedHours: phases.reduce((sum, phase) => sum + phase.durationWeeks * 8, 0), progress: totalCourses ? Math.round(phases.reduce((sum, phase) => sum + phase.courses.reduce((courseSum, course) => courseSum + course.progress, 0), 0) / totalCourses) : 0, phases };
}

module.exports = { PHASES, buildCareerPath, scoreCourse };
