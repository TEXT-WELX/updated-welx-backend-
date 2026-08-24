const router = require("express").Router();
const auth = require("../middleware/auth");
const controller = require("../controllers/careerPath");
router.use(auth);
router.get("/", controller.get);
router.put("/phases/:phaseKey", controller.customizePhase);
module.exports = router;
