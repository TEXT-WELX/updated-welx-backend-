const companyRepository = require("../repositories/companyRepository");
const employerRepository = require("../repositories/employerRepository");
const userRepository = require("../repositories/userRepository");
const { ensureCorporateAccount, notifyLeader, notifyMember, validateCorporatePassword } = require("../services/corporateAccounts");
const { resolveCompanyAccess } = require("../services/companyAccess");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePerson(body) {
  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    designation: String(body.designation || "").trim(),
    skills: Array.isArray(body.skills) ? body.skills : String(body.skills || "").split(",").map((item) => item.trim()).filter(Boolean),
  };
}

function validatePerson(person) {
  if (!person.name) return "Name is required";
  if (!EMAIL_PATTERN.test(person.email)) return "A valid email address is required";
  return null;
}

async function actorProfile(req) {
  return userRepository.findById(req.user._id);
}

async function rejectCrossTenantEmail(employerId, email) {
  const mapped = await employerRepository.findEmployeeByEmail(email);
  if (mapped && mapped.createdBy !== String(employerId)) {
    const error = new Error("This email is already linked to another organization");
    error.code = "TENANT_CONFLICT";
    throw error;
  }
}

function handleError(res, error) {
  if ([11000, "TENANT_CONFLICT", "ACCOUNT_ROLE_CONFLICT"].includes(error?.code)) return res.status(409).json({ message: error.message });
  if (error?.name === "ValidationError" || error?.name === "CastError") return res.status(400).json({ message: error.message });
  console.error("Company hierarchy API error:", error);
  return res.status(500).json({ message: error.message || "Unable to complete the company request" });
}

exports.me = async (req, res) => {
  try {
    const access = await resolveCompanyAccess(req.user);
    const user = await actorProfile(req);
    if (!access) return res.json({ access: null, user: { name: user?.name || "", email: req.user.email, role: req.user.role } });
    if (access.accessRole === "company_head") {
      return res.json({ access, user: { name: user?.name || "", email: req.user.email, role: req.user.role, company: user?.company || "" } });
    }
    const employee = await employerRepository.getEmployee(access.employerId, access.employeeId);
    const team = access.teamId ? await companyRepository.getTeam(access.employerId, access.teamId) : null;
    return res.json({ access, employee, team, user: { name: user?.name || employee?.name || "", email: req.user.email, role: req.user.role, company: user?.company || "" } });
  } catch (error) {
    handleError(res, error);
  }
};

exports.listTeams = async (req, res) => {
  try {
    const teams = await companyRepository.listTeams(req.user._id);
    const employees = await employerRepository.listEmployees(req.user._id);
    res.json({
      teams,
      metrics: {
        totalTeams: teams.length,
        leadersAssigned: teams.filter((team) => team.leader).length,
        teamMembers: employees.filter((employee) => employee.organizationRole !== "team_leader").length,
        unassignedEmployees: employees.filter((employee) => !employee.team).length,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.createTeam = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const department = String(req.body.department || "").trim();
    const description = String(req.body.description || "").trim();
    if (!name || !department) return res.status(400).json({ message: "Team name and department are required" });
    res.status(201).json({ team: await companyRepository.createTeam(req.user._id, { name, department, description }) });
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const deleted = await companyRepository.deleteTeam(req.user._id, req.params.teamId);
    if (!deleted) return res.status(404).json({ message: "Team not found" });
    res.json({ ok: true, message: "Team deleted. Its employees are now unassigned." });
  } catch (error) {
    handleError(res, error);
  }
};

exports.assignLeader = async (req, res) => {
  try {
    const person = normalizePerson(req.body);
    const validation = validatePerson(person);
    if (validation) return res.status(400).json({ message: validation });
    const passwordValidation = validateCorporatePassword(req.body.password);
    if (passwordValidation) return res.status(400).json({ message: passwordValidation });
    const team = await companyRepository.getTeam(req.user._id, req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    await rejectCrossTenantEmail(req.user._id, person.email);
    const actor = await actorProfile(req);
    const account = await ensureCorporateAccount({ name: person.name, email: person.email, company: actor?.company || "Your organization", password: req.body.password });
    const result = await companyRepository.assignLeader(req.user._id, req.params.teamId, {
      ...person,
      designation: person.designation || `${team.department} Team Leader`,
      department: team.department,
      organizationRole: "team_leader",
      team: team.id,
      teamName: team.name,
      userAccount: String(account.user._id),
      invitedBy: String(req.user._id),
      status: "invited",
      invitation: { status: "queued", message: `You have been assigned as leader of ${team.name}.`, invitedAt: new Date() },
    });
    let delivery;
    try {
      delivery = await notifyLeader({ account, company: actor?.company || "your organization", team, assignedBy: actor?.name || "Your company head" });
    } catch (mailError) {
      delivery = { status: "failed", message: mailError.message };
    }
    await employerRepository.updateEmployee(req.user._id, result.employee.id, { invitation: { ...result.employee.invitation, status: delivery.status } });
    res.json({ ...result, notification: delivery });
  } catch (error) {
    handleError(res, error);
  }
};

exports.addMember = async (req, res) => {
  try {
    const access = req.companyAccess;
    if (access.accessRole === "team_leader" && String(access.teamId) !== String(req.params.teamId)) {
      return res.status(403).json({ message: "Team leaders may only onboard members to their own team" });
    }
    const team = await companyRepository.getTeam(access.employerId, req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });
    const person = normalizePerson(req.body);
    const validation = validatePerson(person);
    if (validation) return res.status(400).json({ message: validation });
    const passwordValidation = validateCorporatePassword(req.body.password);
    if (passwordValidation) return res.status(400).json({ message: passwordValidation });
    await rejectCrossTenantEmail(access.employerId, person.email);
    const employer = await userRepository.findById(access.employerId);
    const actor = await actorProfile(req);
    const account = await ensureCorporateAccount({ name: person.name, email: person.email, company: employer?.company || "Your organization", password: req.body.password });
    const result = await companyRepository.addTeamMember(access.employerId, req.params.teamId, {
      ...person,
      designation: person.designation || "Corporate Employee",
      department: team.department,
      organizationRole: "team_member",
      team: team.id,
      teamName: team.name,
      userAccount: String(account.user._id),
      invitedBy: String(req.user._id),
      status: "invited",
      invitation: { status: "queued", message: `Welcome to the ${team.name} team.`, invitedAt: new Date() },
    });
    let delivery;
    try {
      delivery = await notifyMember({ account, company: employer?.company || "your organization", team, invitedBy: actor?.name || "Your team leader" });
    } catch (mailError) {
      delivery = { status: "failed", message: mailError.message };
    }
    await employerRepository.updateEmployee(access.employerId, result.employee.id, { invitation: { ...result.employee.invitation, status: delivery.status } });
    res.status(201).json({ ...result, notification: delivery });
  } catch (error) {
    handleError(res, error);
  }
};

exports.dashboard = async (req, res) => {
  try {
    res.json(await companyRepository.getCompanyDashboard(req.user._id));
  } catch (error) {
    handleError(res, error);
  }
};

exports.leaderDashboard = async (req, res) => {
  try {
    if (req.companyAccess.accessRole !== "team_leader") return res.status(403).json({ message: "Team-leader access is required" });
    const dashboard = await companyRepository.getLeaderDashboard(req.companyAccess);
    if (!dashboard) return res.status(404).json({ message: "Assigned team not found" });
    res.json(dashboard);
  } catch (error) {
    handleError(res, error);
  }
};

exports.report = async (req, res) => {
  try {
    const employees = await employerRepository.listEmployees(req.user._id);
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Employee", "Email", "Team", "Department", "Organization role", "Assigned", "Completed", "Progress", "Status"],
      ...employees.map((employee) => [employee.name, employee.email, employee.teamName, employee.department, employee.organizationRole, employee.assignedCourses, employee.completedCourses, `${employee.progress}%`, employee.status]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=welx-company-report.csv");
    res.send(csv);
  } catch (error) {
    handleError(res, error);
  }
};
