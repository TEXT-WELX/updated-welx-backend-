const nodemailer = require("nodemailer");
const { paymentMailSend } = require("../helper/PaymentMail");

function smtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
}

async function sendCompanyMail({ to, subject, text, html }) {
  const options = {
    from: process.env.COMPANY_MAIL_FROM || process.env.SMTP_FROM || "WELX Learning <no-reply@mywelx.com>",
    to,
    subject,
    text,
    html,
  };
  const transport = smtpTransport();
  if (transport) {
    const result = await transport.sendMail(options);
    return { status: "sent", messageId: result.messageId };
  }
  if (process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_KEY_ID && process.env.SES_REGION) {
    const result = await paymentMailSend(options);
    return { status: "sent", messageId: result.messageId };
  }
  return { status: "queued", messageId: `local-${Date.now()}` };
}

module.exports = { sendCompanyMail };
