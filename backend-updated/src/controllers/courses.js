const Course = require('../models/Course');
const { LOCAL_COURSE_CATALOG } = require('../repositories/employerRepository');

// Get all courses
exports.list = async (req, res) => {
  try {
    if (process.env.USE_LOCAL_FILE_DB === 'true') return res.json(LOCAL_COURSE_CATALOG);
    let courses = await Course.find().sort({ createdAt: -1 });

    // If no courses exist, seed with basic data
    if (courses.length === 0) {
      const sampleCourses = [
        {
          title: 'JavaScript Fundamentals',
          description: 'Master the basics of JavaScript programming, from variables and functions to objects and arrays.',
          category: 'Programming',
          skills: ['Programming', 'Web Development', 'JavaScript'],
          tags: ['software engineer', 'frontend', 'technical'],
          duration: '8 weeks',
          level: 'Beginner',
          price: 99,
          rating: 4.8,
          students: 15420,
          instructor: 'Sarah Johnson',
          image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&h=400&fit=crop',
          modules: [
            {
              id: 1,
              title: 'Getting Started with JavaScript',
              description: 'Introduction to JavaScript and setting up your development environment',
              lessons: [
                {
                  id: 1,
                  title: 'What is JavaScript?',
                  type: 'video',
                  duration: '15 min',
                  videoUrl: 'https://www.youtube.com/embed/PkZNo7MFNFg',
                  content: ''
                },
                {
                  id: 2,
                  title: 'Setting Up Your Environment',
                  type: 'reading',
                  duration: '10 min',
                  videoUrl: '',
                  content: 'Setting up your JavaScript development environment with text editors and browsers.'
                }
              ]
            },
            {
              id: 2,
              title: 'Variables and Data Types',
              description: 'Learn about JavaScript variables, data types, and basic operations',
              lessons: [
                {
                  id: 3,
                  title: 'Variables: var, let, const',
                  type: 'video',
                  duration: '20 min',
                  videoUrl: 'https://www.youtube.com/embed/dORtHJ3pOUM',
                  content: ''
                },
                {
                  id: 4,
                  title: 'JavaScript Data Types',
                  type: 'reading',
                  duration: '15 min',
                  videoUrl: '',
                  content: 'Learn about JavaScript primitive data types: String, Number, Boolean, Undefined, Null, Symbol, and BigInt.'
                }
              ]
            }
          ]
        },
        {
          title: 'React.js Complete Course',
          description: 'Build modern web applications with React.js. Learn components, state management, hooks, and best practices.',
          category: 'Web Development',
          skills: ['Programming', 'Web Development', 'React'],
          tags: ['software engineer', 'frontend', 'technical'],
          duration: '12 weeks',
          level: 'Intermediate',
          price: 149,
          rating: 4.9,
          students: 23150,
          instructor: 'Mike Chen',
          image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop',
          modules: [
            {
              id: 1,
              title: 'React Fundamentals',
              description: 'Core concepts of React including JSX, components, and props',
              lessons: [
                {
                  id: 1,
                  title: 'Introduction to React',
                  type: 'video',
                  duration: '18 min',
                  videoUrl: 'https://www.youtube.com/embed/Ke90Tje7VS0',
                  content: ''
                },
                {
                  id: 2,
                  title: 'JSX and Components',
                  type: 'reading',
                  duration: '12 min',
                  videoUrl: '',
                  content: 'Learn about JSX syntax and how to create React components with props.'
                }
              ]
            }
          ]
        },
        {
          title: 'Python for Data Science',
          description: 'Learn Python programming specifically for data science applications.',
          category: 'Data Science',
          skills: ['Programming', 'Data Analysis', 'Machine Learning'],
          tags: ['data scientist', 'data analyst', 'technical'],
          duration: '10 weeks',
          level: 'Beginner',
          price: 129,
          rating: 4.7,
          students: 18750,
          instructor: 'Dr. Emily Rodriguez',
          image: 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=600&h=400&fit=crop',
          modules: [
            {
              id: 1,
              title: 'Python Basics for Data Science',
              description: 'Python fundamentals with a focus on data manipulation',
              lessons: [
                {
                  id: 1,
                  title: 'Python Installation and Setup',
                  type: 'video',
                  duration: '16 min',
                  videoUrl: 'https://www.youtube.com/embed/Y8Tko2YC5hA',
                  content: ''
                }
              ]
            }
          ]
        },
        {
          title: 'Node.js Backend Development',
          description: 'Build robust backend applications with Node.js and Express.js.',
          category: 'Web Development',
          skills: ['Programming', 'Web Development', 'Node.js'],
          tags: ['software engineer', 'backend', 'technical'],
          duration: '9 weeks',
          level: 'Intermediate',
          price: 139,
          rating: 4.6,
          students: 12340,
          instructor: 'Alex Thompson',
          image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&h=400&fit=crop',
          modules: [
            {
              id: 1,
              title: 'Node.js and Express Setup',
              description: 'Setting up Node.js environment and Express framework',
              lessons: [
                {
                  id: 1,
                  title: 'Installing Node.js',
                  type: 'video',
                  duration: '14 min',
                  videoUrl: 'https://www.youtube.com/embed/TlB_eWDSMt4',
                  content: ''
                }
              ]
            }
          ]
        }
      ];

      courses = await Course.insertMany(sampleCourses);
      console.log('Seeded database with sample courses');
    }

    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get course by ID
exports.getById = async (req, res) => {
  try {
    if (process.env.USE_LOCAL_FILE_DB === 'true') {
      const course = LOCAL_COURSE_CATALOG.find((item) => item._id === req.params.id);
      return course ? res.json(course) : res.status(404).json({ message: 'Course not found' });
    }
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ message: err.message });
  }
};

// Create new course
exports.create = async (req, res) => {
  try {
    const course = new Course(req.body);
    const savedCourse = await course.save();
    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update course
exports.update = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete course
exports.delete = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
