const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  source: { type: String, enum: ["single", "phase_bundle", "employer"], default: "single" },
  phaseKey: { type: String, default: "" },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
  completedLessonIds: [{ type: String }],
  completedModuleIds: [{ type: String }],
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
module.exports = mongoose.model("CourseEnrollment", enrollmentSchema);
