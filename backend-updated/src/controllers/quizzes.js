const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');

// Generate a random quiz for a course/module
exports.generateQuiz = async (req, res) => {
  try {
    const { courseId, moduleId, type = 'module' } = req.body;
    const userId = req.user.id;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Find quiz for the course/module
    let quiz = await Quiz.findOne({
      courseId,
      moduleId: moduleId || null,
      type,
      isActive: true
    });

    // If no quiz exists, create a sample one
    if (!quiz) {
      quiz = await createSampleQuiz(courseId, moduleId, type);
    }

    // Check if user has attempts left
    const attemptsCount = await QuizAttempt.countDocuments({
      userId,
      quizId: quiz._id
    });

    if (attemptsCount >= quiz.attemptsAllowed) {
      return res.status(400).json({
        message: `Maximum attempts (${quiz.attemptsAllowed}) reached for this quiz`
      });
    }

    // Generate random questions from the quiz
    const questions = await generateRandomQuestions(quiz);

    res.json({
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      questions,
      attemptNumber: attemptsCount + 1
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ message: 'Error generating quiz', error: error.message });
  }
};

// Submit quiz answers
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, answers, timeSpent } = req.body;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;

    const processedAnswers = answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      if (!question) return { ...answer, isCorrect: false, points: 0 };

      const isCorrect = answer.selectedAnswer === question.correct;
      const points = isCorrect ? question.points : 0;

      if (isCorrect) correctAnswers++;
      totalPoints += question.points;

      return {
        ...answer,
        isCorrect,
        points
      };
    });

    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Save quiz attempt
    const quizAttempt = new QuizAttempt({
      userId,
      quizId,
      courseId: quiz.courseId,
      answers: processedAnswers,
      score,
      passed,
      timeSpent,
      attemptNumber: await QuizAttempt.countDocuments({ userId, quizId }) + 1,
      questions: quiz.questions.map(q => ({
        questionId: q._id,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }))
    });

    await quizAttempt.save();

    res.json({
      attemptId: quizAttempt._id,
      score,
      passed,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      timeSpent,
      passingScore: quiz.passingScore
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};

// Get quiz attempts for a user
exports.getQuizAttempts = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const attempts = await QuizAttempt.find({
      userId,
      courseId
    })
    .populate('quizId', 'title type moduleId')
    .sort({ createdAt: -1 });

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ message: 'Error fetching quiz attempts', error: error.message });
  }
};

// Get specific quiz attempt
exports.getQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      userId
    }).populate('quizId', 'title type');

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    res.status(500).json({ message: 'Error fetching quiz attempt', error: error.message });
  }
};

// Helper function to create sample quiz
async function createSampleQuiz(courseId, moduleId, type) {
  const sampleQuestions = {
    '1': { // React course
      1: [ // Module 1
        {
          question: 'What is React?',
          options: [
            'A JavaScript library for building user interfaces',
            'A database management system',
            'A web server',
            'A CSS framework'
          ],
          correct: 0,
          explanation: 'React is a JavaScript library developed by Facebook for building user interfaces.',
          difficulty: 'easy',
          category: 'react-basics'
        },
        {
          question: 'What does JSX stand for?',
          options: [
            'JavaScript XML',
            'JavaScript Extension',
            'Java Standard Extension',
            'JavaScript Syntax'
          ],
          correct: 0,
          explanation: 'JSX stands for JavaScript XML and allows you to write HTML-like syntax in JavaScript.',
          difficulty: 'easy',
          category: 'jsx'
        }
      ],
      null: [ // Final quiz
        {
          question: 'What is the virtual DOM in React?',
          options: [
            'A copy of the real DOM kept in memory',
            'A database for storing component data',
            'A testing environment',
            'A CSS framework'
          ],
          correct: 0,
          explanation: 'The virtual DOM is a JavaScript representation of the actual DOM kept in memory.',
          difficulty: 'medium',
          category: 'react-core'
        },
        {
          question: 'How do you handle events in React?',
          options: [
            'Using inline JavaScript',
            'Using event handlers passed as props',
            'Using jQuery',
            'Using vanilla JavaScript'
          ],
          correct: 1,
          explanation: 'React uses synthetic events that are wrappers around native events.',
          difficulty: 'medium',
          category: 'react-events'
        }
      ]
    }
  };

  const courseQuestions = sampleQuestions[courseId];
  const questions = courseQuestions ? (courseQuestions[moduleId] || courseQuestions[null] || []) : [];

  const quiz = new Quiz({
    title: type === 'final' ? 'Final Course Assessment' : `Module ${moduleId} Quiz`,
    description: type === 'final' ? 'Comprehensive assessment of course knowledge' : `Assessment for module ${moduleId}`,
    courseId,
    moduleId,
    type,
    questions,
    timeLimit: type === 'final' ? 1800 : 600, // 30 min for final, 10 min for module
    passingScore: 70
  });

  return await quiz.save();
}

// Helper function to generate random questions
async function generateRandomQuestions(quiz) {
  const questions = quiz.questions;
  const questionCount = Math.min(questions.length, 5); // Max 5 questions per quiz

  // Shuffle questions and take first N
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, questionCount);

  return selectedQuestions.map(q => ({
    questionId: q._id,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    difficulty: q.difficulty,
    category: q.category
  }));
}
