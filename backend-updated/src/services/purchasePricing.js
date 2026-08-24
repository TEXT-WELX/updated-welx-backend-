function calculatePurchase(courses, purchaseType) {
  const subtotal = courses.reduce((sum, course) => sum + Number(course.price || 0), 0);
  const discountPercent = purchaseType === "phase_bundle" && courses.length > 1 ? 20 : 0;
  const total = Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100;
  return { subtotal, discountPercent, total, amountInFils: Math.round(total * 100) };
}
module.exports = { calculatePurchase };
