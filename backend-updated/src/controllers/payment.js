const Course = require("../models/Course");
const Payment = require("../models/Payment");
const CourseEnrollment = require("../models/CourseEnrollment");
const Stripe = require("stripe");
const path = require("path");
const ejs = require("ejs");
const { paymentMailSend } = require("../helper/PaymentMail");
const { calculatePurchase } = require("../services/purchasePricing");

exports.create = async (req, res) => {
  try {
    const purchaseType = req.body.purchaseType === "phase_bundle" ? "phase_bundle" : "single";
    const ids = [...new Set((req.body.courseIds || (req.body.courseId ? [req.body.courseId] : [])).map(String))];
    if (!ids.length || ids.length > 3) return res.status(400).json({ message: "Choose between 1 and 3 courses" });
    if (purchaseType === "single" && ids.length !== 1) return res.status(400).json({ message: "Multiple courses must be purchased as a phase bundle" });
    const courses = await Course.find({ _id: { $in: ids } }).lean();
    if (courses.length !== ids.length) return res.status(404).json({ message: "One or more courses were not found" });
    const pricing = calculatePurchase(courses, purchaseType);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.create({ amount: pricing.amountInFils, currency: "aed", automatic_payment_methods: { enabled: false }, payment_method_types: ["card"], metadata: { course_ids: ids.join(","), purchase_type: purchaseType, phase_key: req.body.phaseKey || "", user_id: String(req.user._id) } });
    const payment = await Payment.create({ courseId: ids[0], courseIds: ids, userId: req.user._id, stripeId: intent.id, status: "CREATED", price: pricing.amountInFils, subtotal: Math.round(pricing.subtotal * 100), discountPercent: pricing.discountPercent, purchaseType, phaseKey: req.body.phaseKey || "", response: intent });
    return res.json({ id: payment._id, paymentId: intent.id, clientSecret: intent.client_secret, pricing });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const { id, paymentId, result } = req.body;
    if (!id || !paymentId) return res.status(400).json({ message: "Payment ID is required" });
    const payment = await Payment.findById(id);
    if (!payment || String(payment.userId) !== String(req.user._id)) return res.status(404).json({ message: "Payment not found" });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.retrieve(paymentId);
    if (!result?.error && intent.status === "succeeded") {
      payment.status = "SUCCESS"; payment.response = intent; await payment.save();
      const ids = (payment.courseIds?.length ? payment.courseIds : [payment.courseId]).filter(Boolean);
      await Promise.all(ids.map((courseId) => CourseEnrollment.updateOne({ userId: String(req.user._id), courseId }, { $setOnInsert: { userId: String(req.user._id), courseId, enrolledAt: new Date() }, $set: { source: payment.purchaseType, phaseKey: payment.phaseKey, paymentId: payment._id } }, { upsert: true })));
      const courses = await Course.find({ _id: { $in: ids } }).lean();
      await sendPaymentMail(courses, payment);
      return res.json({ id: intent.id, status: "SUCCESS", enrolledCourseIds: ids.map(String), message: "Payment succeeded and your courses are unlocked." });
    }
    if (result?.error) {
      const canceled = await stripe.paymentIntents.cancel(paymentId, { cancellation_reason: "requested_by_customer" });
      payment.status = "FAILED"; payment.response = canceled; payment.error = result.error; await payment.save();
      return res.json({ id: intent.id, status: "FAILED", message: "The payment failed." });
    }
    payment.status = "PROCESSING"; payment.response = intent; await payment.save();
    return res.json({ id: intent.id, status: "PROCESSING", message: "The payment is processing." });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};

async function sendPaymentMail(courses, payment) {
  try {
    const title = courses.map((course) => course.title).join(", ");
    const html = await ejs.renderFile(path.join(__dirname, "../templates/mailTemplate.ejs"), { courseName: title, amount: payment.response.amount_received / 100, stripeID: payment.stripeId, paymentDate: new Date(payment.response.created * 1000).toLocaleString("en-GB") });
    await paymentMailSend({ from: "awsqatarwelx20@gmail.com", to: "awsqatarwelx20@gmail.com", subject: `Payment Confirmation - ${title}`, html });
  } catch (error) { console.error("Payment confirmation email failed:", error.message); }
}
