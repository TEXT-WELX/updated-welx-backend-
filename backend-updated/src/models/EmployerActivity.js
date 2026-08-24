const mongoose = require("mongoose");

const employerActivitySchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  employeeName: { type: String, required: true },
  type: {
    type: String,
    enum: ["employee_joined", "invitation_sent", "course_assigned", "course_completed", "certificate_earned", "team_created", "team_deleted", "leader_assigned"],
    required: true,
  },
  description: { type: String, required: true },
}, { timestamps: true });

employerActivitySchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model("EmployerActivity", employerActivitySchema);
