const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct: { type: Number, required: true }, // Index of correct answer
  explanation: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  category: { type: String, default: '' }, // e.g., 'react-hooks', 'python-basics'
  points: { type: Number, default: 1 }
}, { timestamps: true });

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleId: { type: Number, default: null }, // null for final quiz
  type: { type: String, enum: ['module', 'final'], default: 'module' },
  questions: [questionSchema],
  timeLimit: { type: Number, default: 600 }, // in seconds, default 10 minutes
  passingScore: { type: Number, default: 70 }, // percentage
  attemptsAllowed: { type: Number, default: 3 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for efficient querying
quizSchema.index({ courseId: 1, moduleId: 1 });
quizSchema.index({ courseId: 1, type: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
