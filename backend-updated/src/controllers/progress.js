const Course = require("../models/Course");
const CourseEnrollment = require("../models/CourseEnrollment");
const { awardUserPoints } = require("../services/welxPoints");

const userId = (req) => String(req.user._id);
const lessonIds = (course) => course.modules.flatMap((module) => (module.lessons || []).map((lesson) => String(lesson.id)));
const completedModules = (course, completed) => course.modules.filter((module) => (module.lessons || []).length > 0 && module.lessons.every((lesson) => completed.includes(String(lesson.id)))).map((module) => String(module.id));
const response = (enrollment) => ({ courseId: String(enrollment.courseId), completedLessons: enrollment.completedLessonIds || [], completedModules: enrollment.completedModuleIds || [], overallProgress: enrollment.progress || 0, status: enrollment.status, enrolled: true });

async function getOwnedEnrollment(req, res) {
  const enrollment = await CourseEnrollment.findOne({ userId: userId(req), courseId: req.params.courseId });
  if (!enrollment) res.status(403).json({ message: "Purchase or receive this course before starting it" });
  return enrollment;
}

exports.getCourseProgress = async (req, res) => { try { const enrollment = await getOwnedEnrollment(req, res); if (enrollment) res.json(response(enrollment)); } catch (error) { res.status(500).json({ message: error.message }); } };
exports.initializeCourseProgress = async (req, res) => { try { const enrollment = await getOwnedEnrollment(req, res); if (enrollment) res.json({ message: "Course is ready", ...response(enrollment) }); } catch (error) { res.status(500).json({ message: error.message }); } };

exports.updateLessonProgress = async (req, res) => {
  try {
    const [course, enrollment] = await Promise.all([Course.findById(req.params.courseId), getOwnedEnrollment(req, res)]);
    if (!enrollment) return;
    if (!course) return res.status(404).json({ message: "Course not found" });
    const id = String(req.params.lessonId);
    if (!lessonIds(course).includes(id)) return res.status(404).json({ message: "Lesson not found" });
    const completed = new Set((enrollment.completedLessonIds || []).map(String));
    const wasCompleted = completed.has(id);
    if (req.body.completed === false) completed.delete(id); else completed.add(id);
    const wasCourseComplete = Number(enrollment.progress || 0) >= 100;
    const allIds = lessonIds(course);
    const progress = allIds.length ? Math.round((completed.size / allIds.length) * 100) : 0;
    enrollment.completedLessonIds = [...completed];
    enrollment.completedModuleIds = completedModules(course, [...completed]);
    enrollment.progress = progress;
    enrollment.status = progress >= 100 ? "completed" : "active";
    enrollment.completedAt = progress >= 100 ? new Date() : null;
    await enrollment.save();
    let points = null;
    if (!wasCompleted && completed.has(id)) {
      points = await awardUserPoints(userId(req), { action: "lesson_completed", eventId: `lesson:${req.params.courseId}:${id}`, metadata: { courseId: req.params.courseId, lessonId: id, courseTitle: course.title } });
    }
    if (!wasCourseComplete && progress >= 100) {
      points = await awardUserPoints(userId(req), { action: "course_completed", eventId: `course:${req.params.courseId}:complete`, metadata: { courseId: req.params.courseId, courseTitle: course.title } });
    }
    return res.json({ message: "Progress saved", ...response(enrollment), points });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};

exports.getModuleProgress = async (req, res) => {
  try {
    const [course, enrollment] = await Promise.all([Course.findById(req.params.courseId).lean(), getOwnedEnrollment(req, res)]);
    if (!enrollment) return;
    if (!course) return res.status(404).json({ message: "Course not found" });
    const completedLessons = (enrollment.completedLessonIds || []).map(String);
    const modules = course.modules.map((module, index) => ({ id: module.id, title: module.title, isCompleted: enrollment.completedModuleIds.includes(String(module.id)), isUnlocked: index === 0 || enrollment.completedModuleIds.includes(String(course.modules[index - 1].id)), lessons: (module.lessons || []).map((lesson) => ({ ...lesson, isCompleted: completedLessons.includes(String(lesson.id)) })) }));
    return res.json({ courseId: req.params.courseId, modules, overallProgress: enrollment.progress });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};
