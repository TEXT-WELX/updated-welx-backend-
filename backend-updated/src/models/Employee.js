const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  organizationRole: {
    type: String,
    enum: ['team_member', 'team_leader'],
    default: 'team_member',
    index: true,
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
  teamName: { type: String, default: '' },
  userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  skills: [{ type: String, trim: true }],
  assignedCourses: { type: Number, default: 0 },
  completedCourses: { type: Number, default: 0 },
  certificatesEarned: { type: Number, default: 0 },
  learningHours: { type: Number, default: 0 },
  avgQuizScore: { type: Number, default: 0 },
  engagementLevel: { type: Number, default: 0 },
  goalAchievement: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'invited', 'pending'], default: 'invited' },
  invitation: {
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    message: { type: String, default: '' },
    invitedAt: { type: Date, default: Date.now }
  },
  courseAssignments: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    title: { type: String, required: true },
    category: { type: String, default: 'General' },
    duration: { type: String, default: '' },
    level: { type: String, default: 'beginner' },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

employeeSchema.index({ createdBy: 1, email: 1 }, { unique: true });
employeeSchema.index({ email: 1, organizationRole: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
