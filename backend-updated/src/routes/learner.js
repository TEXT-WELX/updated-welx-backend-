const router = require("express").Router();
const auth = require("../middleware/auth");
const learner = require("../controllers/learner");

router.get("/dashboard", auth, learner.dashboard);
module.exports = router;
