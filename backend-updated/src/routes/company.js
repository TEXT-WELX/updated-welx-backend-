const router = require("express").Router();
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const companyManager = require("../middleware/companyManager");
const ctrl = require("../controllers/company");

router.use(auth);
router.get("/me", ctrl.me);
router.get("/leader-dashboard", companyManager, ctrl.leaderDashboard);
router.post("/teams/:teamId/members", companyManager, ctrl.addMember);
router.get("/teams", requireRole("employer"), ctrl.listTeams);
router.post("/teams", requireRole("employer"), ctrl.createTeam);
router.delete("/teams/:teamId", requireRole("employer"), ctrl.deleteTeam);
router.put("/teams/:teamId/leader", requireRole("employer"), ctrl.assignLeader);
router.get("/dashboard", requireRole("employer"), ctrl.dashboard);
router.get("/report", requireRole("employer"), ctrl.report);

module.exports = router;
