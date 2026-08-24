const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedAnswer: { type: Number, required: true }, // Index of selected answer
  isCorrect: { type: Boolean, required: true },
  points: { type: Number, default: 0 }
});

const quizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  answers: [answerSchema],
  score: { type: Number, required: true }, // Percentage score
  passed: { type: Boolean, required: true },
  timeSpent: { type: Number, default: 0 }, // in seconds
  attemptNumber: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now },
  questions: [{ // Store the actual questions that were asked
    questionId: mongoose.Schema.Types.ObjectId,
    question: String,
    options: [String],
    correct: Number,
    explanation: String
  }]
}, { timestamps: true });

// Index for efficient querying
quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ userId: 1, courseId: 1 });
quizAttemptSchema.index({ courseId: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
