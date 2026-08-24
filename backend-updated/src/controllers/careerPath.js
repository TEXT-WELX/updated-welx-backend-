const Course = require("../models/Course");
const CourseEnrollment = require("../models/CourseEnrollment");
const userRepository = require("../repositories/userRepository");
const { PHASES, buildCareerPath } = require("../services/careerPath");
const { LOCAL_COURSE_CATALOG } = require("../repositories/employerRepository");

exports.get = async (req, res) => {
  try {
    const user = await userRepository.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.onboardingData) return res.status(409).json({ message: "Complete onboarding before generating a career path" });
    const [courses, enrollments] = process.env.USE_LOCAL_FILE_DB === "true"
      ? [LOCAL_COURSE_CATALOG, []]
      : await Promise.all([Course.find().lean(), CourseEnrollment.find({ userId: String(req.user._id) }).lean()]);
    return res.json({ careerPath: buildCareerPath({ courses, onboarding: user.onboardingData, enrollments }) });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};

exports.customizePhase = async (req, res) => {
  try {
    const { phaseKey } = req.params;
    const ids = [...new Set((req.body.courseIds || []).map(String))];
    if (!PHASES.some((phase) => phase.key === phaseKey)) return res.status(404).json({ message: "Unknown career phase" });
    if (!ids.length || ids.length > 3) return res.status(400).json({ message: "Choose between 1 and 3 courses for this phase" });
    const courseCount = process.env.USE_LOCAL_FILE_DB === "true"
      ? LOCAL_COURSE_CATALOG.filter((course) => ids.includes(String(course._id))).length
      : await Course.countDocuments({ _id: { $in: ids } });
    if (courseCount !== ids.length) return res.status(400).json({ message: "One or more selected marketplace courses no longer exist" });
    const user = await userRepository.findById(req.user._id);
    if (!user?.onboardingData) return res.status(409).json({ message: "Complete onboarding first" });
    const onboardingData = JSON.parse(JSON.stringify(user.onboardingData));
    onboardingData.careerPath = onboardingData.careerPath || { phases: {} };
    onboardingData.careerPath.phases = onboardingData.careerPath.phases || {};
    onboardingData.careerPath.phases[phaseKey] = { courseIds: ids, updatedAt: new Date().toISOString() };
    await userRepository.updateById(req.user._id, { onboardingData });
    return res.json({ ok: true, phaseKey, courseIds: ids });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};
