const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateId: { type: String, unique: true, required: true }, // Unique certificate identifier
  courseTitle: { type: String, required: true },
  userName: { type: String, required: true },
  instructorName: { type: String, required: true },
  completionDate: { type: Date, default: Date.now },
  finalScore: { type: Number, required: true }, // Final quiz score
  certificateUrl: { type: String, default: '' }, // URL to generated PDF
  verificationCode: { type: String, unique: true, required: true }, // For certificate verification
  isValid: { type: Boolean, default: true },
  issuedBy: { type: String, default: 'Wel.x Learning Platform' },
  skills: [{ type: String }], // Skills/competencies gained
  metadata: {
    quizAttempts: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    modulesCompleted: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Index for efficient querying
certificateSchema.index({ userId: 1, courseId: 1 });
certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ verificationCode: 1 });

// Pre-save middleware to generate unique IDs
certificateSchema.pre('save', function(next) {
  if (!this.certificateId) {
    this.certificateId = `WEL${this.courseId.toString().slice(-6)}${Date.now().toString().slice(-6)}`;
  }

  if (!this.verificationCode) {
    this.verificationCode = `VERIFY${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`.toUpperCase();
  }

  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
