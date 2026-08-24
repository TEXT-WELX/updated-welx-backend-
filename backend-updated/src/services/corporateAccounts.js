const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const userRepository = require("../repositories/userRepository");
const { sendCompanyMail } = require("./companyMailer");

function temporaryPassword() {
  return `${crypto.randomBytes(6).toString("base64url")}Aa1!`;
}

function validateCorporatePassword(password) {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 72) return "Password must be 72 characters or fewer";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must include at least one letter and one number";
  return null;
}

async function ensureCorporateAccount({ name, email, company, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const suppliedPassword = typeof password === "string" && password.length ? password : null;
  let user = await userRepository.findByEmail(normalizedEmail);
  if (user && user.role !== "employee") {
    const error = new Error("This email belongs to a non-corporate WELX account");
    error.code = "ACCOUNT_ROLE_CONFLICT";
    throw error;
  }
  if (user) {
    const changes = { name: name || user.name, company: company || user.company || "" };
    if (suppliedPassword) {
      changes.password = await bcrypt.hash(suppliedPassword, 10);
      changes.requiresPasswordReset = false;
    }
    user = await userRepository.updateById(user._id, changes);
    return { user, wasCreated: false, password: suppliedPassword, passwordWasSet: Boolean(suppliedPassword) };
  }
  const accountPassword = suppliedPassword || temporaryPassword();
  user = await userRepository.create({
    name,
    email: normalizedEmail,
    password: await bcrypt.hash(accountPassword, 10),
    role: "employee",
    company: company || "",
    requiresPasswordReset: !suppliedPassword,
  });
  return { user, wasCreated: true, password: accountPassword, passwordWasSet: Boolean(suppliedPassword) };
}

function credentialsText(account) {
  if (account.password) {
    const passwordLabel = account.passwordWasSet ? "WELX password" : "Temporary password";
    const nextStep = account.passwordWasSet ? "Use these credentials to sign in as Corporate Employee." : "Please sign in as Corporate Employee and change your password.";
    return `\nEmail: ${account.user.email}\n${passwordLabel}: ${account.password}\n${nextStep}`;
  }
  return `\nUse your existing WELX Corporate Employee credentials to sign in.`;
}

async function notifyLeader({ account, company, team, assignedBy }) {
  const text = `Hello ${account.user.name},\n\n${assignedBy} has assigned you as Team Leader for ${team.name} (${team.department}) at ${company}.${credentialsText(account)}\n\nYour WELX dashboard now includes team management and course assignment tools.`;
  return sendCompanyMail({
    to: account.user.email,
    subject: `You are now the ${team.name} Team Leader on WELX`,
    text,
    html: `<p>Hello ${account.user.name},</p><p><strong>${assignedBy}</strong> has assigned you as Team Leader for <strong>${team.name}</strong> (${team.department}) at ${company}.</p><pre>${credentialsText(account).trim()}</pre><p>Your WELX dashboard now includes team management and course assignment tools.</p>`,
  });
}

async function notifyMember({ account, company, team, invitedBy }) {
  const text = `Hello ${account.user.name},\n\n${invitedBy} has onboarded you to the ${team?.name || "company"} team at ${company}.${credentialsText(account)}\n\nYour assigned learning will appear in your Corporate Employee dashboard.`;
  return sendCompanyMail({
    to: account.user.email,
    subject: `Welcome to ${company} on WELX`,
    text,
    html: `<p>Hello ${account.user.name},</p><p><strong>${invitedBy}</strong> has onboarded you to the <strong>${team?.name || "company"}</strong> team at ${company}.</p><pre>${credentialsText(account).trim()}</pre><p>Your assigned learning will appear in your Corporate Employee dashboard.</p>`,
  });
}

module.exports = { ensureCorporateAccount, notifyLeader, notifyMember, validateCorporatePassword };
