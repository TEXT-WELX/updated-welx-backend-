const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: String, default: '' },
  level: { type: String, default: 'beginner' },
  price: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  students: { type: Number, default: 0 },
  instructor: { type: String, default: 'Expert Instructor' },
  image: { type: String, default: '' },
  modules: [{
    id: Number,
    title: String,
    description: String,
    videoLesson: {
      id: Number,
      title: String,
      type: { type: String, default: 'video' },
      duration: String,
      videoUrl: String,
      description: String,
      isCompleted: { type: Boolean, default: false }
    },
    readingLesson: {
      id: Number,
      title: String,
      type: { type: String, default: 'reading' },
      duration: String,
      content: String,
      description: String,
      isCompleted: { type: Boolean, default: false }
    },
    quizLesson: {
      id: Number,
      title: String,
      type: { type: String, default: 'quiz' },
      duration: String,
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
      description: String,
      isCompleted: { type: Boolean, default: false },
      isUnlocked: { type: Boolean, default: false }
    },
    isUnlocked: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false }
  }],
  // New fields for enhanced functionality
  quizRequired: { type: Boolean, default: true }, // Whether quiz is required for completion
  certificateEnabled: { type: Boolean, default: true }, // Whether certificate is available
  skills: [{ type: String }], // Skills taught in this course
  prerequisites: [{ type: String }], // Course prerequisites
  tags: [{ type: String }], // Course tags for search/filtering
  totalLessons: { type: Number, default: 0 },
  estimatedHours: { type: Number, default: 0 }
}, { timestamps: true });

// Index for better search performance
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ level: 1, rating: -1 });
courseSchema.index({ price: 1, rating: -1 });

module.exports = mongoose.model('CourseEnhanced', courseSchema);
