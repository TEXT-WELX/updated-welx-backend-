const router = require('express').Router();
const ctrl = require('../controllers/progress');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get user progress for a course
router.get('/courses/:courseId/progress', ctrl.getCourseProgress);

// Update lesson progress
router.post('/courses/:courseId/progress/lessons/:lessonId', ctrl.updateLessonProgress);

// Get module progress
router.get('/courses/:courseId/progress/modules', ctrl.getModuleProgress);

// Initialize course progress for enrolled user
router.post('/courses/:courseId/progress/initialize', ctrl.initializeCourseProgress);

module.exports = router;
