const employerRepository = require("../repositories/employerRepository");
const companyRepository = require("../repositories/companyRepository");
const userRepository = require("../repositories/userRepository");
const CourseEnrollment = require("../models/CourseEnrollment");
const { ensureCorporateAccount, notifyMember, validateCorporatePassword } = require("../services/corporateAccounts");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.map((skill) => String(skill).trim()).filter(Boolean);
  return String(skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
}

function normalizeEmployee(body, { partial = false } = {}) {
  const employee = {};
  if (!partial || body.name !== undefined) employee.name = String(body.name || "").trim();
  if (!partial || body.email !== undefined) employee.email = String(body.email || "").trim().toLowerCase();
  if (!partial || body.department !== undefined) employee.department = String(body.department || "").trim();
  if (!partial || body.designation !== undefined) employee.designation = String(body.designation || "").trim();
  if (!partial || body.skills !== undefined) employee.skills = normalizeSkills(body.skills);
  if (body.status !== undefined) employee.status = String(body.status).trim().toLowerCase();
  return employee;
}

function validateEmployee(employee, { partial = false } = {}) {
  const errors = [];
  if (!partial || employee.name !== undefined) if (!employee.name) errors.push("Employee name is required");
  if (!partial || employee.email !== undefined) if (!EMAIL_PATTERN.test(employee.email || "")) errors.push("A valid employee email is required");
  if (!partial || employee.department !== undefined) if (!employee.department) errors.push("Department is required");
  return errors;
}

function handleError(res, error) {
  if ([11000, "TENANT_CONFLICT", "ACCOUNT_ROLE_CONFLICT"].includes(error?.code)) return res.status(409).json({ message: error.message || "Employee already exists" });
  if (error?.name === "ValidationError" || error?.name === "CastError") return res.status(400).json({ message: error.message });
  console.error("Employer employee API error:", error);
  return res.status(500).json({ message: "Unable to complete the employer request" });
}

function employerId(req) {
  return req.companyAccess.employerId;
}

function isLeader(req) {
  return req.companyAccess.accessRole === "team_leader";
}

function mayAccessEmployee(req, employee) {
  if (!employee) return false;
  if (!isLeader(req)) return true;
  return String(employee.team || "") === String(req.companyAccess.teamId)
    && employee.organizationRole !== "team_leader";
}

async function scopedEmployee(req, employeeId) {
  const employee = await employerRepository.getEmployee(employerId(req), employeeId);
  return mayAccessEmployee(req, employee) ? employee : null;
}

async function teamForNewEmployee(req, requestedTeamId) {
  const teamId = isLeader(req) ? req.companyAccess.teamId : requestedTeamId;
  if (!teamId) return null;
  const team = await companyRepository.getTeam(employerId(req), teamId);
  if (!team) {
    const error = new Error("Selected team was not found");
    error.name = "ValidationError";
    throw error;
  }
  return team;
}

async function sendOnboarding(req, employee, team, password) {
  const owner = await userRepository.findById(employerId(req));
  const actor = await userRepository.findById(req.user._id);
  const account = await ensureCorporateAccount({ name: employee.name, email: employee.email, company: owner?.company || "Your organization", password });
  let delivery;
  try {
    delivery = await notifyMember({ account, company: owner?.company || "your organization", team, invitedBy: actor?.name || "Your manager" });
  } catch (mailError) {
    delivery = { status: "failed", message: mailError.message };
  }
  const updated = await employerRepository.updateEmployee(employerId(req), employee.id, {
    userAccount: String(account.user._id),
    invitedBy: String(req.user._id),
    invitation: { ...(employee.invitation || {}), status: delivery.status },
  });
  return { employee: updated || employee, delivery };
}

exports.list = async (req, res) => {
  try {
    let employees = await employerRepository.listEmployees(employerId(req));
    if (isLeader(req)) employees = employees.filter((employee) => mayAccessEmployee(req, employee));
    const query = String(req.query.q || "").trim().toLowerCase();
    const department = String(req.query.department || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    if (query) employees = employees.filter((employee) => `${employee.name} ${employee.email} ${employee.designation}`.toLowerCase().includes(query));
    if (department && department !== "all") employees = employees.filter((employee) => employee.department.toLowerCase() === department);
    if (status && status !== "all") employees = employees.filter((employee) => employee.status === status);
    res.json(employees);
  } catch (error) {
    handleError(res, error);
  }
};

exports.get = async (req, res) => {
  try {
    const employee = await scopedEmployee(req, req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    handleError(res, error);
  }
};

exports.create = async (req, res) => {
  try {
    const employeeData = normalizeEmployee(req.body);
    const errors = validateEmployee(employeeData);
    if (errors.length) return res.status(400).json({ message: errors.join(". "), errors });
    const passwordValidation = validateCorporatePassword(req.body.password);
    if (passwordValidation) return res.status(400).json({ message: passwordValidation });
    const team = await teamForNewEmployee(req, req.body.team || req.body.teamId);
    if (team) {
      employeeData.team = team.id;
      employeeData.teamName = team.name;
      employeeData.department = team.department;
    }
    employeeData.organizationRole = "team_member";
    employeeData.invitedBy = String(req.user._id);
    employeeData.status = "invited";
    employeeData.invitation = {
      status: "queued",
      message: String(req.body.invitationMessage || "Welcome to WELX. Your employer has invited you to join their learning team."),
      invitedAt: new Date(),
    };
    const employee = await employerRepository.createEmployee(employerId(req), employeeData, "invitation_sent");
    const onboarding = await sendOnboarding(req, employee, team, req.body.password);
    res.status(201).json({ employee: onboarding.employee, invitation: onboarding.delivery });
  } catch (error) {
    handleError(res, error);
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await scopedEmployee(req, req.params.id);
    if (!existing) return res.status(404).json({ message: "Employee not found" });
    const changes = normalizeEmployee(req.body, { partial: true });
    if (isLeader(req)) {
      delete changes.organizationRole;
      delete changes.team;
      changes.department = req.companyAccess.department;
    }
    const errors = validateEmployee(changes, { partial: true });
    if (errors.length) return res.status(400).json({ message: errors.join(". "), errors });
    const employee = await employerRepository.updateEmployee(employerId(req), req.params.id, changes);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    handleError(res, error);
  }
};

exports.remove = async (req, res) => {
  try {
    if (isLeader(req)) return res.status(403).json({ message: "Only the company head can remove employees" });
    const existing = await employerRepository.getEmployee(employerId(req), req.params.id);
    if (!existing) return res.status(404).json({ message: "Employee not found" });
    await companyRepository.clearLeadershipForEmployee(employerId(req), existing.id);
    const removed = await employerRepository.removeEmployee(employerId(req), req.params.id);
    if (!removed) return res.status(404).json({ message: "Employee not found" });
    if (existing.userAccount) await userRepository.updateById(existing.userAccount, { company: "" });
    res.json({ ok: true, message: `${existing.name} was removed from the organization. Their standalone WELX account was preserved.` });
  } catch (error) {
    handleError(res, error);
  }
};

exports.invite = async (req, res) => {
  try {
    const rawEmails = Array.isArray(req.body.emails) ? req.body.emails : String(req.body.emails || "").split(/[\n,]/);
    const emails = [...new Set(rawEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
    const invalidEmails = emails.filter((email) => !EMAIL_PATTERN.test(email));
    if (!emails.length || invalidEmails.length) {
      return res.status(400).json({ message: "Provide valid email addresses", invalidEmails });
    }
    const message = String(req.body.message || "Welcome to WELX. Your employer has invited you to join their learning team.").trim();
    const team = await teamForNewEmployee(req, req.body.team || req.body.teamId);
    const created = [];
    const errors = [];
    for (const email of emails) {
      try {
        const employee = await employerRepository.createEmployee(employerId(req), {
          name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          email,
          department: team?.department || "General",
          designation: "Employee",
          organizationRole: "team_member",
          team: team?.id || null,
          teamName: team?.name || "",
          invitedBy: String(req.user._id),
          skills: [],
          status: "invited",
          invitation: { status: "queued", message, invitedAt: new Date() },
        }, "invitation_sent");
        created.push((await sendOnboarding(req, employee, team)).employee);
      } catch (error) {
        errors.push({ email, message: error.code === 11000 ? "Already belongs to your organization" : error.message });
      }
    }
    const status = created.length ? 201 : 409;
    res.status(status).json({ employees: created, errors, invitation: { status: "queued" } });
  } catch (error) {
    handleError(res, error);
  }
};

exports.bulkImport = async (req, res) => {
  try {
    if (!Array.isArray(req.body.employees) || !req.body.employees.length) return res.status(400).json({ message: "No employee rows were supplied" });
    const imported = [];
    const errors = [];
    for (const [index, row] of req.body.employees.entries()) {
      const employeeData = normalizeEmployee(row);
      const rowErrors = validateEmployee(employeeData);
      if (rowErrors.length) {
        errors.push({ row: index + 2, email: employeeData.email, message: rowErrors.join(". ") });
        continue;
      }
      try {
        const team = await teamForNewEmployee(req, row.team || row.teamId);
        const employee = await employerRepository.createEmployee(employerId(req), {
          ...employeeData,
          organizationRole: "team_member",
          team: team?.id || null,
          teamName: team?.name || "",
          department: team?.department || employeeData.department,
          invitedBy: String(req.user._id),
          status: "invited",
          invitation: { status: "queued", message: "Welcome to WELX. You were added through your employer's team import.", invitedAt: new Date() },
        }, "invitation_sent");
        imported.push((await sendOnboarding(req, employee, team)).employee);
      } catch (error) {
        errors.push({ row: index + 2, email: employeeData.email, message: error.code === 11000 ? "Already exists" : error.message });
      }
    }
    res.status(imported.length ? 201 : 400).json({ employees: imported, errors });
  } catch (error) {
    handleError(res, error);
  }
};

exports.courses = async (_req, res) => {
  try {
    res.json(await employerRepository.listAssignableCourses());
  } catch (error) {
    handleError(res, error);
  }
};

exports.assignCourses = async (req, res) => {
  try {
    const courseIds = Array.isArray(req.body.courseIds) ? req.body.courseIds : [];
    if (!courseIds.length) return res.status(400).json({ message: "Select at least one course" });
    const target = await scopedEmployee(req, req.params.id);
    if (!target) return res.status(404).json({ message: "Employee not found" });
    const result = await employerRepository.assignCourses(employerId(req), req.params.id, courseIds);
    if (!result) return res.status(404).json({ message: "Employee not found" });
    await syncEmployeeEnrollments(result.employee, courseIds);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

exports.assignBundles = async (req, res) => {
  try {
    const employeeIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds : [];
    const courseIds = Array.isArray(req.body.courseIds) ? req.body.courseIds : [];
    if (!employeeIds.length || !courseIds.length) return res.status(400).json({ message: "Select employees and courses before assigning" });
    const targets = await Promise.all(employeeIds.map((employeeId) => scopedEmployee(req, employeeId)));
    if (targets.some((employee) => !employee)) return res.status(403).json({ message: "One or more selected employees are outside your management scope" });
    const result = await employerRepository.assignCoursesToMany(employerId(req), employeeIds, courseIds);
    await Promise.all((result.employees || []).map((employee) => syncEmployeeEnrollments(employee, courseIds)));
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

async function syncEmployeeEnrollments(employee, courseIds) {
  if (process.env.USE_LOCAL_FILE_DB === "true" || !employee?.userAccount) return;
  await Promise.all([...new Set(courseIds.map(String))].map((courseId) => CourseEnrollment.updateOne(
    { userId: String(employee.userAccount), courseId },
    { $setOnInsert: { userId: String(employee.userAccount), courseId, enrolledAt: new Date() }, $set: { source: "employer" } },
    { upsert: true },
  )));
}

exports.summary = async (req, res) => {
  try {
    res.json(await employerRepository.getDashboardSummary(employerId(req), isLeader(req) ? { teamId: req.companyAccess.teamId } : {}));
  } catch (error) {
    handleError(res, error);
  }
};

exports.activity = async (req, res) => {
  try {
    if (!isLeader(req)) return res.json(await employerRepository.listActivities(employerId(req), 20));
    const employees = await employerRepository.listEmployees(employerId(req));
    const employeeIds = employees.filter((employee) => mayAccessEmployee(req, employee)).map((employee) => employee.id);
    res.json(await employerRepository.listActivities(employerId(req), 20, { employeeIds }));
  } catch (error) {
    handleError(res, error);
  }
};
