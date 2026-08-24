const router = require("express").Router();
const auth = require("../middleware/auth");
const points = require("../controllers/points");

router.use(auth);
router.get("/me", points.me);
router.post("/award", points.award);

module.exports = router;
