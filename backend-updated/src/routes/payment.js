const router = require("express").Router();
const { create, update } = require("../controllers/payment");
const auth = require("../middleware/auth");

// All payment routes require authentication
router.use(auth);

router.post("/create", create);
router.post("/update", update);

module.exports = router;
