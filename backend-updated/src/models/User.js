const mongoose = require('mongoose');
const { USER_ROLES } = require('../constants/userRoles');

const pointActivitySchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  points: { type: Number, required: true },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: USER_ROLES, default: 'student' },
  company: {
    type: String,
    trim: true,
    required: function companyRequiredForEmployer() { return this.role === 'employer'; }
  },
  requiresPasswordReset: { type: Boolean, default: false },
  onboardingComplete: { type: Boolean, default: false },
  onboardingData: { type: Object, default: null },
  welxPoints: { type: Number, min: 0, default: 0 },
  pointActivities: { type: [pointActivitySchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
