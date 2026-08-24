const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

connectDB();

app.get('/', (req, res) => res.json({ ok: true, service: 'wlex-backend-enhanced' }));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/onboarding', require('./src/routes/onboarding'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/courses', require('./src/routes/courses'));
app.use('/api/quizzes', require('./src/routes/quizzes'));
app.use('/api/certificates', require('./src/routes/certificates'));
app.use('/api/progress', require('./src/routes/progress'));

const port = process.env.PORT || 5001;

// Function to find an available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();

    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next port
        findAvailablePort(startPort + 1).then(resolve, reject);
      } else {
        reject(err);
      }
    });
  });
}

// Start server with error handling
async function startServer() {
  try {
    const availablePort = await findAvailablePort(port);
    app.listen(availablePort, () => {
      console.log(`🚀 Server running on port: ${availablePort}`);
      console.log(`📚 Available endpoints:`);
      console.log(`   GET  /api/courses - Get all courses`);
      console.log(`   GET  /api/courses/:id - Get course by ID`);
      console.log(`   POST /api/quizzes/generate - Generate quiz`);
      console.log(`   POST /api/quizzes/submit - Submit quiz answers`);
      console.log(`   POST /api/certificates/generate - Generate certificate`);
      console.log(`   GET  /api/certificates - Get user certificates`);
      console.log(`   GET  /api/progress/courses/:courseId/progress - Get course progress`);
      console.log(`   POST /api/progress/courses/:courseId/progress/lessons/:lessonId - Update lesson progress`);
      if (availablePort !== port) {
        console.log(`⚠️  Port ${port} was in use, using ${availablePort} instead`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
