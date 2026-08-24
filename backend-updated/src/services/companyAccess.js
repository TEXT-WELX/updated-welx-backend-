const employerRepository = require("../repositories/employerRepository");

async function resolveCompanyAccess(user) {
  if (!user) return null;
  if (user.role === "employer") {
    return {
      accessRole: "company_head",
      employerId: String(user._id),
      employeeId: null,
      teamId: null,
      teamName: "",
      department: "",
    };
  }
  if (user.role !== "employee") return null;
  const employee = await employerRepository.findEmployeeByEmail(user.email);
  if (!employee) return null;
  return {
    accessRole: employee.organizationRole || "team_member",
    employerId: employee.createdBy,
    employeeId: employee.id,
    teamId: employee.team || null,
    teamName: employee.teamName || "",
    department: employee.department || "",
  };
}

module.exports = { resolveCompanyAccess };
