const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const Employee = require("../models/Employee");
const EmployerActivity = require("../models/EmployerActivity");
const Team = require("../models/Team");
const employerRepository = require("./employerRepository");

function usesLocalStore() {
  return process.env.USE_LOCAL_FILE_DB === "true";
}

function getLocalStorePath() {
  return process.env.LOCAL_EMPLOYER_DB_PATH
    ? path.resolve(process.env.LOCAL_EMPLOYER_DB_PATH)
    : path.resolve(__dirname, "../../data/dev-employer.json");
}

async function readStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(getLocalStorePath(), "utf8"));
    return {
      employees: Array.isArray(parsed.employees) ? parsed.employees : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return { employees: [], activities: [], teams: [] };
    throw error;
  }
}

async function writeStore(store) {
  const filename = getLocalStorePath();
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, JSON.stringify(store, null, 2), "utf8");
}

function asEmployee(employee) {
  if (!employee) return null;
  const value = employee.toObject ? employee.toObject() : { ...employee };
  const assignments = Array.isArray(value.courseAssignments) ? value.courseAssignments : [];
  const assignedCourses = assignments.length || Number(value.assignedCourses || 0);
  const completedCourses = assignments.length
    ? assignments.filter((assignment) => assignment.completedAt || Number(assignment.progress) >= 100).length
    : Number(value.completedCourses || 0);
  return {
    ...value,
    _id: String(value._id),
    id: String(value._id),
    createdBy: value.createdBy ? String(value.createdBy) : "",
    team: value.team ? String(value.team) : null,
    userAccount: value.userAccount ? String(value.userAccount) : null,
    organizationRole: value.organizationRole || "team_member",
    teamName: value.teamName || "",
    assignedCourses,
    completedCourses,
    progress: assignedCourses
      ? Math.round(assignments.length
        ? assignments.reduce((sum, item) => sum + Number(item.progress || 0), 0) / assignments.length
        : (completedCourses / assignedCourses) * 100)
      : 0,
  };
}

function activity(employerId, employee, type, description) {
  return {
    _id: crypto.randomUUID(),
    employer: String(employerId),
    employee: employee?._id ? String(employee._id) : null,
    employeeName: employee?.name || "Organization",
    type,
    description,
    createdAt: new Date().toISOString(),
  };
}

function duplicate(message) {
  const error = new Error(message);
  error.code = 11000;
  return error;
}

function tenantConflict() {
  const error = new Error("This email is already linked to another organization");
  error.code = "TENANT_CONFLICT";
  return error;
}

function buildLocalEmployee(employerId, data) {
  const now = new Date().toISOString();
  return {
    _id: crypto.randomUUID(),
    name: data.name,
    email: data.email,
    designation: data.designation || "Employee",
    department: data.department || "General",
    organizationRole: data.organizationRole || "team_member",
    team: data.team || null,
    teamName: data.teamName || "",
    userAccount: data.userAccount || null,
    invitedBy: data.invitedBy || null,
    skills: data.skills || [],
    assignedCourses: 0,
    completedCourses: 0,
    certificatesEarned: 0,
    learningHours: 0,
    avgQuizScore: 0,
    engagementLevel: 0,
    goalAchievement: 0,
    status: data.status || "invited",
    invitation: data.invitation || { status: "queued", message: "", invitedAt: now },
    courseAssignments: [],
    createdBy: String(employerId),
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function serializeTeam(team, employees) {
  const value = team.toObject ? team.toObject() : { ...team };
  const id = String(value._id);
  const members = employees.filter((employee) => String(employee.team || "") === id);
  const leader = members.find((employee) => employee.organizationRole === "team_leader" && (!value.leader || String(employee._id) === String(value.leader)))
    || employees.find((employee) => String(employee._id) === String(value.leader))
    || null;
  const teamMembers = members.filter((employee) => employee.organizationRole !== "team_leader");
  return {
    ...value,
    _id: id,
    id,
    createdBy: String(value.createdBy),
    leader: leader ? asEmployee(leader) : null,
    members: teamMembers.map(asEmployee),
    memberCount: teamMembers.length,
    activeMembers: teamMembers.filter((employee) => employee.status === "active").length,
    avgCompletion: teamMembers.length
      ? Math.round(teamMembers.reduce((sum, employee) => sum + asEmployee(employee).progress, 0) / teamMembers.length)
      : 0,
  };
}

async function listTeams(employerId) {
  if (usesLocalStore()) {
    const store = await readStore();
    const employees = store.employees.filter((employee) => employee.createdBy === String(employerId));
    return store.teams
      .filter((team) => team.createdBy === String(employerId))
      .map((team) => serializeTeam(team, employees));
  }
  const [teams, employees] = await Promise.all([
    Team.find({ createdBy: employerId }).sort({ createdAt: -1 }).lean(),
    Employee.find({ createdBy: employerId }).lean(),
  ]);
  return teams.map((team) => serializeTeam(team, employees));
}

async function getTeam(employerId, teamId) {
  const teams = await listTeams(employerId);
  return teams.find((team) => team.id === String(teamId)) || null;
}

async function createTeam(employerId, data) {
  if (usesLocalStore()) {
    const store = await readStore();
    if (store.teams.some((team) => team.createdBy === String(employerId) && team.name.toLowerCase() === data.name.toLowerCase())) {
      throw duplicate("A team with this name already exists");
    }
    const now = new Date().toISOString();
    const team = { _id: crypto.randomUUID(), ...data, leader: null, createdBy: String(employerId), createdAt: now, updatedAt: now };
    store.teams.unshift(team);
    store.activities.unshift(activity(employerId, null, "team_created", `${team.name} team was created`));
    await writeStore(store);
    return serializeTeam(team, []);
  }
  const team = await Team.create({ ...data, createdBy: employerId });
  await EmployerActivity.create({ employer: employerId, employeeName: "Organization", type: "team_created", description: `${team.name} team was created` });
  return serializeTeam(team, []);
}

async function deleteTeam(employerId, teamId) {
  if (usesLocalStore()) {
    const store = await readStore();
    const index = store.teams.findIndex((team) => team._id === String(teamId) && team.createdBy === String(employerId));
    if (index < 0) return null;
    const [team] = store.teams.splice(index, 1);
    store.employees = store.employees.map((employee) => employee.createdBy === String(employerId) && String(employee.team || "") === String(teamId)
      ? { ...employee, team: null, teamName: "", organizationRole: "team_member", updatedAt: new Date().toISOString() }
      : employee);
    store.activities.unshift(activity(employerId, null, "team_deleted", `${team.name} team was deleted; its members are now unassigned`));
    await writeStore(store);
    return team;
  }
  const team = await Team.findOneAndDelete({ _id: teamId, createdBy: employerId });
  if (!team) return null;
  await Employee.updateMany({ createdBy: employerId, team: teamId }, { $set: { team: null, teamName: "", organizationRole: "team_member" } });
  await EmployerActivity.create({ employer: employerId, employeeName: "Organization", type: "team_deleted", description: `${team.name} team was deleted; its members are now unassigned` });
  return team.toObject();
}

async function ensureEmailAvailable(store, employerId, email) {
  const crossTenant = usesLocalStore()
    ? store.employees.find((employee) => employee.email === email && employee.createdBy !== String(employerId))
    : await Employee.findOne({ email, createdBy: { $ne: employerId } }).lean();
  if (crossTenant) throw tenantConflict();
}

async function assignLeader(employerId, teamId, data) {
  if (usesLocalStore()) {
    const store = await readStore();
    const team = store.teams.find((item) => item._id === String(teamId) && item.createdBy === String(employerId));
    if (!team) return null;
    await ensureEmailAvailable(store, employerId, data.email);
    const previousLeaderId = team.leader ? String(team.leader) : null;
    if (previousLeaderId) {
      const previous = store.employees.find((employee) => employee._id === previousLeaderId);
      if (previous) previous.organizationRole = "team_member";
    }
    for (const otherTeam of store.teams) if (String(otherTeam.leader || "") && store.employees.find((employee) => employee._id === String(otherTeam.leader) && employee.email === data.email)) otherTeam.leader = null;
    let employee = store.employees.find((item) => item.createdBy === String(employerId) && item.email === data.email);
    if (!employee) {
      employee = buildLocalEmployee(employerId, data);
      store.employees.unshift(employee);
    }
    Object.assign(employee, data, { organizationRole: "team_leader", team: String(teamId), teamName: team.name, department: team.department, updatedAt: new Date().toISOString() });
    team.leader = employee._id;
    team.updatedAt = new Date().toISOString();
    store.activities.unshift(activity(employerId, employee, "leader_assigned", `was assigned as leader of ${team.name}`));
    await writeStore(store);
    return { team: serializeTeam(team, store.employees), employee: asEmployee(employee) };
  }
  const team = await Team.findOne({ _id: teamId, createdBy: employerId });
  if (!team) return null;
  await ensureEmailAvailable(null, employerId, data.email);
  let employee = await Employee.findOne({ createdBy: employerId, email: data.email });
  if (!employee) employee = await Employee.create({ ...data, createdBy: employerId });
  await Team.updateMany({ createdBy: employerId, leader: employee._id, _id: { $ne: teamId } }, { $set: { leader: null } });
  if (team.leader && String(team.leader) !== String(employee._id)) await Employee.updateOne({ _id: team.leader, createdBy: employerId }, { $set: { organizationRole: "team_member" } });
  Object.assign(employee, data, { organizationRole: "team_leader", team: team._id, teamName: team.name, department: team.department });
  await employee.save();
  team.leader = employee._id;
  await team.save();
  await EmployerActivity.create({ employer: employerId, employee: employee._id, employeeName: employee.name, type: "leader_assigned", description: `was assigned as leader of ${team.name}` });
  return { team: await getTeam(employerId, teamId), employee: asEmployee(employee) };
}

async function addTeamMember(employerId, teamId, data) {
  if (usesLocalStore()) {
    const store = await readStore();
    const team = store.teams.find((item) => item._id === String(teamId) && item.createdBy === String(employerId));
    if (!team) return null;
    await ensureEmailAvailable(store, employerId, data.email);
    let employee = store.employees.find((item) => item.createdBy === String(employerId) && item.email === data.email);
    if (employee?.organizationRole === "team_leader") throw new Error("A team leader must be reassigned from the roles panel first");
    if (!employee) {
      employee = buildLocalEmployee(employerId, data);
      store.employees.unshift(employee);
    }
    Object.assign(employee, data, { organizationRole: "team_member", team: String(teamId), teamName: team.name, department: team.department, updatedAt: new Date().toISOString() });
    store.activities.unshift(activity(employerId, employee, "invitation_sent", `was onboarded to ${team.name}`));
    await writeStore(store);
    return { team: serializeTeam(team, store.employees), employee: asEmployee(employee) };
  }
  const team = await Team.findOne({ _id: teamId, createdBy: employerId });
  if (!team) return null;
  await ensureEmailAvailable(null, employerId, data.email);
  let employee = await Employee.findOne({ createdBy: employerId, email: data.email });
  if (employee?.organizationRole === "team_leader") throw new Error("A team leader must be reassigned from the roles panel first");
  if (!employee) employee = await Employee.create({ ...data, createdBy: employerId });
  else {
    Object.assign(employee, data, { organizationRole: "team_member", team: team._id, teamName: team.name, department: team.department });
    await employee.save();
  }
  await EmployerActivity.create({ employer: employerId, employee: employee._id, employeeName: employee.name, type: "invitation_sent", description: `was onboarded to ${team.name}` });
  return { team: await getTeam(employerId, teamId), employee: asEmployee(employee) };
}

async function getCompanyDashboard(employerId) {
  const [teams, summary, employees] = await Promise.all([
    listTeams(employerId),
    employerRepository.getDashboardSummary(employerId),
    employerRepository.listEmployees(employerId),
  ]);
  return {
    ...summary,
    companyMetrics: {
      totalTeams: teams.length,
      teamLeaders: teams.filter((team) => team.leader).length,
      teamMembers: employees.filter((employee) => employee.organizationRole !== "team_leader").length,
      unassignedEmployees: employees.filter((employee) => !employee.team).length,
    },
    teams,
  };
}

async function getLeaderDashboard(access) {
  const [team, employees, summary] = await Promise.all([
    getTeam(access.employerId, access.teamId),
    employerRepository.listEmployees(access.employerId),
    employerRepository.getDashboardSummary(access.employerId, { teamId: access.teamId }),
  ]);
  if (!team) return null;
  return {
    access,
    team,
    leader: employees.find((employee) => employee.id === String(access.employeeId)) || null,
    employees: employees.filter((employee) => String(employee.team || "") === String(access.teamId) && employee.organizationRole !== "team_leader"),
    summary,
  };
}

async function clearLeadershipForEmployee(employerId, employeeId) {
  if (usesLocalStore()) {
    const store = await readStore();
    let changed = false;
    store.teams = store.teams.map((team) => {
      if (team.createdBy === String(employerId) && String(team.leader || "") === String(employeeId)) {
        changed = true;
        return { ...team, leader: null, updatedAt: new Date().toISOString() };
      }
      return team;
    });
    if (changed) await writeStore(store);
    return changed;
  }
  const result = await Team.updateMany(
    { createdBy: employerId, leader: employeeId },
    { $set: { leader: null } },
  );
  return result.modifiedCount > 0;
}

module.exports = {
  addTeamMember,
  assignLeader,
  clearLeadershipForEmployee,
  createTeam,
  deleteTeam,
  getCompanyDashboard,
  getLeaderDashboard,
  getTeam,
  listTeams,
};
