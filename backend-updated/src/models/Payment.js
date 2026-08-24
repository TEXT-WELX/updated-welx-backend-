const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false,
    },
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    purchaseType: { type: String, enum: ["single", "phase_bundle"], default: "single" },
    phaseKey: { type: String, default: "" },
    subtotal: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    stripeId: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, required: true },
    response: { type: Object, required: true, default: {} },
    error: { type: Object, required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
