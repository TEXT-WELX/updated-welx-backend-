const router = require("express").Router();
const auth = require("../middleware/auth");
const companyManager = require("../middleware/companyManager");
const ctrl = require("../controllers/employerEmployees");

router.use(auth, companyManager);
router.get("/summary", ctrl.summary);
router.get("/activity", ctrl.activity);
router.get("/assignable-courses", ctrl.courses);
router.post("/invitations", ctrl.invite);
router.post("/bulk", ctrl.bulkImport);
router.post("/assign-bundles", ctrl.assignBundles);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.get);
router.post("/:id/assign-courses", ctrl.assignCourses);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
