const router = require('express').Router();
const ctrl = require('../controllers/quizzes');
const auth = require('../middleware/auth');

// All quiz routes require authentication
router.use(auth);

// Generate a quiz
router.post('/generate', ctrl.generateQuiz);

// Submit quiz answers
router.post('/submit', ctrl.submitQuiz);

// Get quiz attempts for a course
router.get('/attempts/:courseId', ctrl.getQuizAttempts);

// Get specific quiz attempt
router.get('/attempts/single/:attemptId', ctrl.getQuizAttempt);

module.exports = router;
