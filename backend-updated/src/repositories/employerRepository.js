const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const Course = require("../models/Course");
const Employee = require("../models/Employee");
const EmployerActivity = require("../models/EmployerActivity");

const LOCAL_COURSE_CATALOG = [
  { title: "Advanced React Patterns", category: "Programming", duration: "8 weeks", level: "advanced", price: 179, rating: 4.8, skills: ["Programming", "Web Development", "React"], tags: ["software engineer", "React", "Programming"], image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=500&fit=crop" },
  { title: "Machine Learning Basics", category: "Data Science", duration: "12 weeks", level: "intermediate", price: 159, rating: 4.7, skills: ["Machine Learning", "Data Analysis"], tags: ["data scientist", "Machine Learning", "Data Science"], image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop" },
  { title: "Project Management", category: "Business", duration: "6 weeks", level: "beginner", price: 99, rating: 4.6, skills: ["Project Management", "Leadership"], tags: ["Management", "Business"], image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop" },
  { title: "Digital Marketing Strategy", category: "Marketing", duration: "10 weeks", level: "intermediate", price: 129, rating: 4.9, skills: ["Digital Marketing", "Commerce"], tags: ["Marketing"], image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop" },
  { title: "Python for Automation", category: "Programming", duration: "15 weeks", level: "intermediate", price: 149, rating: 4.5, skills: ["Programming", "Python"], tags: ["software engineer", "Python", "Programming"], image: "https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=800&h=500&fit=crop" },
  { title: "Cybersecurity Essentials", category: "Cybersecurity", duration: "9 weeks", level: "beginner", price: 119, rating: 4.7, skills: ["Cybersecurity", "Critical Thinking"], tags: ["Cybersecurity"], image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=500&fit=crop" },
  { title: "JavaScript Foundations", category: "Programming", duration: "6 weeks", level: "beginner", price: 109, rating: 4.8, skills: ["Programming", "Web Development", "JavaScript"], tags: ["software engineer", "frontend", "technical"], image: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=500&fit=crop" },
].map((course, index) => ({ _id: `local-course-${index + 1}`, description: `A practical WEL.X course in ${course.category}.`, instructor: "WEL.X Faculty", students: 0, modules: [], ...course }));

function usesLocalStore() {
  return process.env.USE_LOCAL_FILE_DB === "true";
}

function getLocalStorePath() {
  return process.env.LOCAL_EMPLOYER_DB_PATH
    ? path.resolve(process.env.LOCAL_EMPLOYER_DB_PATH)
    : path.resolve(__dirname, "../../data/dev-employer.json");
}

async function readLocalStore() {
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

async function writeLocalStore(store) {
  const filename = getLocalStorePath();
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, JSON.stringify(store, null, 2), "utf8");
}

function serializeEmployee(document) {
  const employee = document?.toObject ? document.toObject() : { ...document };
  const assignments = Array.isArray(employee.courseAssignments) ? employee.courseAssignments : [];
  const assignmentCount = assignments.length || Number(employee.assignedCourses || 0);
  const completedCount = assignments.length
    ? assignments.filter((assignment) => assignment.completedAt || Number(assignment.progress) >= 100).length
    : Number(employee.completedCourses || 0);
  const progress = assignmentCount
    ? Math.round(assignments.length
      ? assignments.reduce((total, assignment) => total + Number(assignment.progress || 0), 0) / assignments.length
      : (completedCount / assignmentCount) * 100)
    : 0;

  return {
    ...employee,
    _id: String(employee._id),
    id: String(employee._id),
    createdBy: employee.createdBy ? String(employee.createdBy) : "",
    team: employee.team ? String(employee.team) : null,
    userAccount: employee.userAccount ? String(employee.userAccount) : null,
    organizationRole: employee.organizationRole || "team_member",
    teamName: employee.teamName || "",
    assignedCourses: assignmentCount,
    completedCourses: completedCount,
    progress,
    skills: Array.isArray(employee.skills) ? employee.skills : [],
    courseAssignments: assignments.map((assignment) => ({
      ...(assignment?.toObject ? assignment.toObject() : assignment),
      course: assignment.course ? String(assignment.course) : null,
    })),
  };
}

function createLocalActivity(employerId, employee, type, description) {
  return {
    _id: crypto.randomUUID(),
    employer: String(employerId),
    employee: employee?._id || null,
    employeeName: employee?.name || "Team member",
    type,
    description,
    createdAt: new Date().toISOString(),
  };
}

async function recordActivity(employerId, employee, type, description, localStore) {
  if (usesLocalStore()) {
    const store = localStore || await readLocalStore();
    store.activities.unshift(createLocalActivity(employerId, employee, type, description));
    store.activities = store.activities.slice(0, 200);
    if (!localStore) await writeLocalStore(store);
    return;
  }
  await EmployerActivity.create({
    employer: employerId,
    employee: employee?._id || null,
    employeeName: employee?.name || "Team member",
    type,
    description,
  });
}

async function listEmployees(employerId) {
  if (usesLocalStore()) {
    const store = await readLocalStore();
    return store.employees.filter((employee) => employee.createdBy === String(employerId)).map(serializeEmployee);
  }
  const employees = await Employee.find({ createdBy: employerId }).sort({ createdAt: -1 });
  return employees.map(serializeEmployee);
}

async function getEmployee(employerId, employeeId) {
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const employee = store.employees.find((item) => item._id === String(employeeId) && item.createdBy === String(employerId));
    return employee ? serializeEmployee(employee) : null;
  }
  const employee = await Employee.findOne({ _id: employeeId, createdBy: employerId });
  return employee ? serializeEmployee(employee) : null;
}

async function findEmployeeByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const employee = store.employees.find((item) => item.email === normalizedEmail);
    return employee ? serializeEmployee(employee) : null;
  }
  const employee = await Employee.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
  return employee ? serializeEmployee(employee) : null;
}

async function getEmployeeByEmail(employerId, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const employee = store.employees.find((item) => item.createdBy === String(employerId) && item.email === normalizedEmail);
    return employee ? serializeEmployee(employee) : null;
  }
  const employee = await Employee.findOne({ createdBy: employerId, email: normalizedEmail });
  return employee ? serializeEmployee(employee) : null;
}

async function createEmployee(employerId, data, activityType = "employee_joined") {
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const duplicate = store.employees.some((employee) => employee.createdBy === String(employerId) && employee.email === data.email);
    if (duplicate) {
      const error = new Error("An employee with this email already exists in your organization");
      error.code = 11000;
      throw error;
    }
    const now = new Date().toISOString();
    const employee = {
      _id: crypto.randomUUID(),
      ...data,
      createdBy: String(employerId),
      organizationRole: data.organizationRole || "team_member",
      team: data.team ? String(data.team) : null,
      teamName: data.teamName || "",
      courseAssignments: [],
      assignedCourses: 0,
      completedCourses: 0,
      certificatesEarned: 0,
      learningHours: 0,
      avgQuizScore: 0,
      engagementLevel: 0,
      goalAchievement: 0,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    store.employees.unshift(employee);
    const description = activityType === "invitation_sent" ? "was invited to join the organization" : "joined the organization";
    await recordActivity(employerId, employee, activityType, description, store);
    await writeLocalStore(store);
    return serializeEmployee(employee);
  }

  const employee = await Employee.create({ ...data, createdBy: employerId });
  const description = activityType === "invitation_sent" ? "was invited to join the organization" : "joined the organization";
  await recordActivity(employerId, employee, activityType, description);
  return serializeEmployee(employee);
}

async function updateEmployee(employerId, employeeId, changes) {
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const index = store.employees.findIndex((employee) => employee._id === String(employeeId) && employee.createdBy === String(employerId));
    if (index < 0) return null;
    store.employees[index] = { ...store.employees[index], ...changes, updatedAt: new Date().toISOString() };
    await writeLocalStore(store);
    return serializeEmployee(store.employees[index]);
  }
  const employee = await Employee.findOneAndUpdate(
    { _id: employeeId, createdBy: employerId },
    changes,
    { new: true, runValidators: true },
  );
  return employee ? serializeEmployee(employee) : null;
}

async function removeEmployee(employerId, employeeId) {
  if (usesLocalStore()) {
    const store = await readLocalStore();
    const before = store.employees.length;
    store.employees = store.employees.filter((employee) => !(employee._id === String(employeeId) && employee.createdBy === String(employerId)));
    if (store.employees.length === before) return false;
    await writeLocalStore(store);
    return true;
  }
  return Boolean(await Employee.findOneAndDelete({ _id: employeeId, createdBy: employerId }));
}

async function listAssignableCourses() {
  if (usesLocalStore()) return LOCAL_COURSE_CATALOG;
  let courses = await Course.find().select("title category duration level rating tags").sort({ title: 1 });
  if (!courses.length) {
    courses = await Course.insertMany(LOCAL_COURSE_CATALOG.map(({ _id, ...course }) => course));
  }
  return courses.map((course) => ({
    _id: String(course._id),
    title: course.title,
    category: course.category || course.tags?.[0] || "General",
    duration: course.duration,
    level: String(course.level || "beginner").toLowerCase(),
    rating: course.rating,
  }));
}

async function assignCourses(employerId, employeeId, courseIds) {
  const uniqueIds = [...new Set(courseIds.map(String))];
  const catalog = await listAssignableCourses();
  const selectedCourses = catalog.filter((course) => uniqueIds.includes(String(course._id)));
  if (!selectedCourses.length) return { employee: await getEmployee(employerId, employeeId), assigned: 0 };

  if (usesLocalStore()) {
    const store = await readLocalStore();
    const index = store.employees.findIndex((employee) => employee._id === String(employeeId) && employee.createdBy === String(employerId));
    if (index < 0) return null;
    const employee = store.employees[index];
    const currentIds = new Set((employee.courseAssignments || []).map((assignment) => String(assignment.course)));
    const additions = selectedCourses.filter((course) => !currentIds.has(String(course._id))).map((course) => ({
      course: String(course._id),
      title: course.title,
      category: course.category,
      duration: course.duration,
      level: course.level,
      progress: 0,
      assignedAt: new Date().toISOString(),
      completedAt: null,
    }));
    employee.courseAssignments = [...(employee.courseAssignments || []), ...additions];
    employee.assignedCourses = employee.courseAssignments.length;
    employee.updatedAt = new Date().toISOString();
    if (additions.length) await recordActivity(employerId, employee, "course_assigned", `${additions.length} course${additions.length === 1 ? " was" : "s were"} assigned`, store);
    await writeLocalStore(store);
    return { employee: serializeEmployee(employee), assigned: additions.length };
  }

  const employee = await Employee.findOne({ _id: employeeId, createdBy: employerId });
  if (!employee) return null;
  const currentIds = new Set(employee.courseAssignments.map((assignment) => String(assignment.course)));
  const additions = selectedCourses.filter((course) => !currentIds.has(String(course._id)));
  additions.forEach((course) => employee.courseAssignments.push({
    course: course._id,
    title: course.title,
    category: course.category,
    duration: course.duration,
    level: course.level,
  }));
  employee.assignedCourses = employee.courseAssignments.length;
  await employee.save();
  if (additions.length) await recordActivity(employerId, employee, "course_assigned", `${additions.length} course${additions.length === 1 ? " was" : "s were"} assigned`);
  return { employee: serializeEmployee(employee), assigned: additions.length };
}

async function assignCoursesToMany(employerId, employeeIds, courseIds) {
  const results = [];
  for (const employeeId of [...new Set(employeeIds.map(String))]) {
    const result = await assignCourses(employerId, employeeId, courseIds);
    if (result) results.push(result);
  }
  return {
    employeesUpdated: results.length,
    assignmentsCreated: results.reduce((total, result) => total + result.assigned, 0),
    employees: results.map((result) => result.employee),
  };
}

async function listActivities(employerId, limit = 12, { employeeIds } = {}) {
  const allowedIds = employeeIds ? new Set(employeeIds.map(String)) : null;
  if (usesLocalStore()) {
    const store = await readLocalStore();
    return store.activities
      .filter((activity) => activity.employer === String(employerId) && (!allowedIds || allowedIds.has(String(activity.employee))))
      .slice(0, limit);
  }
  const query = { employer: employerId };
  if (allowedIds) query.employee = { $in: [...allowedIds] };
  return EmployerActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getDashboardSummary(employerId, { teamId } = {}) {
  let employees = await listEmployees(employerId);
  if (teamId) employees = employees.filter((employee) => String(employee.team || "") === String(teamId));
  const totalEmployees = employees.length;
  const activeLearners = employees.filter((employee) => employee.status === "active").length;
  const certificatesEarned = employees.reduce((total, employee) => total + Number(employee.certificatesEarned || 0), 0);
  const avgCompletion = totalEmployees ? Math.round(employees.reduce((total, employee) => total + employee.progress, 0) / totalEmployees) : 0;

  const departmentMap = new Map();
  const skillMap = new Map();
  employees.forEach((employee) => {
    const department = employee.department || "General";
    const current = departmentMap.get(department) || { department, assigned: 0, completed: 0 };
    current.assigned += employee.assignedCourses;
    current.completed += employee.completedCourses;
    departmentMap.set(department, current);
    employee.skills.forEach((skill) => skillMap.set(skill, (skillMap.get(skill) || 0) + 1));
  });
  const totalSkills = [...skillMap.values()].reduce((sum, count) => sum + count, 0);

  return {
    metrics: { totalEmployees, activeLearners, avgCompletion, certificatesEarned },
    departmentProgress: [...departmentMap.values()],
    skillsDistribution: [...skillMap.entries()].map(([skill, count]) => ({ skill, value: totalSkills ? Math.round((count / totalSkills) * 100) : 0 })),
    recentActivity: await listActivities(employerId, 8, teamId ? { employeeIds: employees.map((employee) => employee.id) } : {}),
  };
}

module.exports = {
  LOCAL_COURSE_CATALOG,
  assignCourses,
  assignCoursesToMany,
  createEmployee,
  findEmployeeByEmail,
  getDashboardSummary,
  getEmployee,
  getEmployeeByEmail,
  listActivities,
  listAssignableCourses,
  listEmployees,
  removeEmployee,
  updateEmployee,
};
