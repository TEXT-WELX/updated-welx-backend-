const router = require('express').Router();
const { save } = require('../controllers/onboarding');
const auth = require('../middleware/auth');

router.post('/', auth, save);

module.exports = router;
