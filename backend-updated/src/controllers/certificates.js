const Certificate = require('../models/Certificate');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate certificate for completed course
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user has already completed the course
    const existingCertificate = await Certificate.findOne({ userId, courseId });
    if (existingCertificate) {
      return res.json({
        message: 'Certificate already exists',
        certificate: existingCertificate
      });
    }

    // Get user's quiz attempts for this course
    const quizAttempts = await QuizAttempt.find({
      userId,
      courseId,
      passed: true
    }).sort({ score: -1 });

    if (quizAttempts.length === 0) {
      return res.status(400).json({
        message: 'No passing quiz attempts found. Complete the course quizzes first.'
      });
    }

    // Calculate final score (highest score from all attempts)
    const finalScore = Math.max(...quizAttempts.map(attempt => attempt.score));

    // Check if final score meets requirements
    const finalQuizAttempt = quizAttempts.find(attempt => attempt.score === finalScore);
    if (!finalQuizAttempt) {
      return res.status(400).json({
        message: 'Unable to generate certificate. Please complete the final quiz.'
      });
    }

    // Get course completion statistics
    const totalAttempts = await QuizAttempt.countDocuments({ userId, courseId });
    const totalTimeSpent = quizAttempts.reduce((total, attempt) => total + (attempt.timeSpent || 0), 0);

    // Create certificate
    const certificate = new Certificate({
      userId,
      courseId,
      courseTitle: course.title,
      userName: req.user.name || 'Student',
      instructorName: course.instructor,
      finalScore,
      skills: course.skills || [],
      metadata: {
        quizAttempts: totalAttempts,
        totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
        modulesCompleted: course.modules?.length || 0
      }
    });

    await certificate.save();

    // Generate PDF certificate
    const pdfPath = await generateCertificatePDF(certificate, course);

    // Update certificate with PDF URL
    certificate.certificateUrl = `/certificates/${certificate._id}.pdf`;
    await certificate.save();

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate: {
        certificateId: certificate.certificateId,
        courseTitle: certificate.courseTitle,
        userName: certificate.userName,
        completionDate: certificate.completionDate,
        finalScore: certificate.finalScore,
        certificateUrl: certificate.certificateUrl,
        verificationCode: certificate.verificationCode
      }
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Error generating certificate', error: error.message });
  }
};

// Get user's certificates
exports.getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.id;

    const certificates = await Certificate.find({ userId })
      .populate('courseId', 'title instructor image')
      .sort({ createdAt: -1 });

    res.json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Error fetching certificates', error: error.message });
  }
};

// Get specific certificate
exports.getCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId })
      .populate('courseId', 'title instructor image');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ message: 'Error fetching certificate', error: error.message });
  }
};

// Verify certificate by verification code
exports.verifyCertificate = async (req, res) => {
  try {
    const { verificationCode } = req.params;

    const certificate = await Certificate.findOne({ verificationCode })
      .populate('courseId', 'title instructor')
      .populate('userId', 'name');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found or invalid' });
    }

    if (!certificate.isValid) {
      return res.status(400).json({ message: 'Certificate has been revoked' });
    }

    res.json({
      isValid: true,
      certificate: {
        certificateId: certificate.certificateId,
        courseTitle: certificate.courseTitle,
        userName: certificate.userName,
        instructorName: certificate.instructorName,
        completionDate: certificate.completionDate,
        finalScore: certificate.finalScore,
        issuedBy: certificate.issuedBy
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ message: 'Error verifying certificate', error: error.message });
  }
};

// Download certificate PDF
exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findOne({ certificateId });
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const course = await Course.findById(certificate.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const pdfPath = await generateCertificatePDF(certificate, course);

    res.download(pdfPath, `certificate-${certificate.courseTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ message: 'Error downloading certificate', error: error.message });
  }
};

// Helper function to generate certificate PDF
async function generateCertificatePDF(certificate, course) {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(__dirname, '../uploads/certificates');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, `${certificate._id}.pdf`);
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Certificate background and styling
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fill('#f8f9fa');

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .lineWidth(8)
         .strokeColor('#1e40af')
         .stroke();

      // Inner border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
         .lineWidth(2)
         .strokeColor('#3b82f6')
         .stroke();

      // Header
      doc.fontSize(36)
         .fillColor('#1e40af')
         .text('Certificate of Completion', 0, 100, { align: 'center' });

      // Decorative line
      doc.moveTo(100, 140)
         .lineTo(doc.page.width - 100, 140)
         .lineWidth(2)
         .strokeColor('#3b82f6')
         .stroke();

      // Certificate text
      doc.fontSize(20)
         .fillColor('#374151')
         .text('This is to certify that', 0, 200, { align: 'center' });

      doc.fontSize(32)
         .fillColor('#1e40af')
         .text(certificate.userName, 0, 240, { align: 'center' });

      doc.fontSize(20)
         .fillColor('#374151')
         .text('has successfully completed the course', 0, 290, { align: 'center' });

      doc.fontSize(28)
         .fillColor('#1e40af')
         .text(course.title, 0, 330, { align: 'center' });

      // Course details
      doc.fontSize(14)
         .fillColor('#6b7280')
         .text(`Instructor: ${course.instructor}`, 0, 400, { align: 'center' })
         .text(`Completion Date: ${certificate.completionDate.toLocaleDateString()}`, 0, 420, { align: 'center' })
         .text(`Final Score: ${certificate.finalScore}%`, 0, 440, { align: 'center' });

      // Certificate ID and verification
      doc.fontSize(12)
         .fillColor('#9ca3af')
         .text(`Certificate ID: ${certificate.certificateId}`, 0, 500, { align: 'center' })
         .text(`Verification Code: ${certificate.verificationCode}`, 0, 520, { align: 'center' })
         .text('Verify this certificate at: wel-x.com/verify', 0, 540, { align: 'center' });

      // Footer
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text(`Issued by ${certificate.issuedBy}`, 0, doc.page.height - 80, { align: 'center' })
         .text(`Date: ${new Date().toLocaleDateString()}`, 0, doc.page.height - 60, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}
