const { resolveCompanyAccess } = require("../services/companyAccess");

module.exports = async function companyManager(req, res, next) {
  try {
    const access = await resolveCompanyAccess(req.user);
    if (!access || !["company_head", "team_leader"].includes(access.accessRole)) {
      return res.status(403).json({ message: "Company-head or team-leader access is required" });
    }
    if (access.accessRole === "team_leader" && !access.teamId) {
      return res.status(403).json({ message: "This leader is not assigned to an active team" });
    }
    req.companyAccess = access;
    next();
  } catch (error) {
    next(error);
  }
};
