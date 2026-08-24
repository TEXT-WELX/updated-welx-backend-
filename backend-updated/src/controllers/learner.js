const CourseEnrollment = require("../models/CourseEnrollment");
const userRepository = require("../repositories/userRepository");
const { getPointsSummary } = require("../services/welxPoints");

exports.dashboard = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const [points, enrollments] = await Promise.all([
      getPointsSummary(userId),
      userRepository.usesLocalFileDatabase()
        ? Promise.resolve([])
        : CourseEnrollment.find({ userId }).populate("courseId").sort({ updatedAt: -1 }).lean(),
    ]);
    if (!points) return res.status(404).json({ message: "User not found" });
    const courses = enrollments.filter((item) => item.courseId).map((item) => ({
      id: String(item.courseId._id),
      title: item.courseId.title,
      description: item.courseId.description,
      image: item.courseId.image,
      category: item.courseId.category,
      level: item.courseId.level,
      duration: item.courseId.duration,
      progress: Number(item.progress || 0),
      completedLessons: (item.completedLessonIds || []).length,
      status: item.status,
      updatedAt: item.updatedAt,
    }));
    const activities = (points.activities || []).slice(0, 8);
    const now = new Date();
    const momentum = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      const month = date.toLocaleString("en", { month: "short" });
      const value = activities.filter((item) => { const d = new Date(item.createdAt); return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); }).reduce((sum, item) => sum + Number(item.points || 0), 0);
      return { month, points: value };
    });
    return res.json({
      points,
      courses,
      momentum,
      stats: {
        activeCourses: courses.filter((item) => item.status !== "completed").length,
        completedCourses: courses.filter((item) => item.status === "completed").length,
        lessonsCompleted: courses.reduce((sum, item) => sum + item.completedLessons, 0),
        averageProgress: courses.length ? Math.round(courses.reduce((sum, item) => sum + item.progress, 0) / courses.length) : 0,
      },
      activities,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
