const router = require('express').Router();
const ctrl = require('../controllers/certificates');
const auth = require('../middleware/auth');

// All certificate routes require authentication
router.use(auth);

// Generate certificate
router.post('/generate', ctrl.generateCertificate);

// Get user's certificates
router.get('/', ctrl.getUserCertificates);

// Get specific certificate by ID
router.get('/:certificateId', ctrl.getCertificate);

// Verify certificate by verification code
router.get('/verify/:verificationCode', ctrl.verifyCertificate);

// Download certificate PDF
router.get('/download/:certificateId', ctrl.downloadCertificate);

module.exports = router;
