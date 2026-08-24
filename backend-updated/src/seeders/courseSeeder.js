const mongoose = require('mongoose');
const Course = require('../models/CourseEnhanced');
const Quiz = require('../models/Quiz');

const sampleCourses = [
  {
    title: "Complete React Development Course",
    description: "Master React from basics to advanced concepts including hooks, context, and modern patterns. Build real-world applications with best practices.",
    duration: "8 weeks",
    level: "intermediate",
    price: 99,
    rating: 4.8,
    students: 15420,
    instructor: "Sarah Johnson",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
    modules: [
      {
        id: 1,
        title: "React Fundamentals",
        description: "Learn the core concepts of React including components, JSX, and props",
        videoLesson: {
          id: 1,
          title: "Introduction to React Components",
          duration: "25 min",
          videoUrl: "https://www.youtube.com/embed/Ke90Tje7VS0",
          description: "Understanding React components and JSX syntax"
        },
        readingLesson: {
          id: 2,
          title: "React Props and State",
          duration: "15 min",
          content: `# React Props and State

## Props in React

Props are read-only attributes passed from parent to child components. They allow components to receive data from their parent components.

### Key Points:
- Props are immutable (cannot be changed by the receiving component)
- Props are passed down from parent to child
- Props can be any JavaScript value (strings, numbers, objects, functions, etc.)

## State in React

State is a built-in object that allows components to manage and track data that can change over time.

### Key Points:
- State is mutable and can be updated using setState()
- State changes trigger re-renders
- State should be used for data that changes within a component

## Example:

\`\`\`jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Increment
        </button>
      </div>
    );
  }
}
\`\`\`
`,
          description: "Understanding props and state management in React"
        },
        quizLesson: {
          id: 3,
          title: "React Fundamentals Quiz",
          duration: "10 min",
          description: "Test your understanding of React basics"
        }
      },
      {
        id: 2,
        title: "Advanced React Patterns",
        description: "Explore advanced React patterns and best practices",
        videoLesson: {
          id: 4,
          title: "React Hooks Deep Dive",
          duration: "30 min",
          videoUrl: "https://www.youtube.com/embed/TNhaISOUy6Q",
          description: "Mastering useState, useEffect, and custom hooks"
        },
        readingLesson: {
          id: 5,
          title: "Custom Hooks and Context",
          duration: "20 min",
          content: `# Custom Hooks and Context API

## Custom Hooks

Custom hooks allow you to extract component logic into reusable functions. They follow the naming convention of starting with "use".

### Benefits:
- Reusable stateful logic
- Separation of concerns
- Easier testing
- Better code organization

## Context API

Context provides a way to pass data through the component tree without having to pass props down manually at every level.

### When to use Context:
- Theming
- User authentication
- Language/internationalization
- Any data that needs to be accessed by many components

## Example:

\`\`\`jsx
// Custom Hook
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}

// Context
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}
\`\`\`
`,
          description: "Advanced React patterns and custom hooks"
        },
        quizLesson: {
          id: 6,
          title: "Advanced React Quiz",
          duration: "15 min",
          description: "Test your advanced React knowledge"
        }
      }
    ],
    quizRequired: true,
    certificateEnabled: true,
    skills: ["React", "JavaScript", "JSX", "Hooks", "Context API"],
    prerequisites: ["Basic JavaScript", "HTML/CSS"],
    tags: ["react", "javascript", "frontend", "web development"],
    totalLessons: 6,
    estimatedHours: 24
  },
  {
    title: "Data Science with Python",
    description: "Comprehensive course covering Python for data analysis, visualization, and machine learning. From pandas to scikit-learn.",
    duration: "10 weeks",
    level: "intermediate",
    price: 129,
    rating: 4.9,
    students: 8750,
    instructor: "Dr. Michael Chen",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
    modules: [
      {
        id: 1,
        title: "Python for Data Analysis",
        description: "Master pandas, numpy, and data manipulation techniques",
        videoLesson: {
          id: 1,
          title: "Introduction to Pandas",
          duration: "35 min",
          videoUrl: "https://www.youtube.com/embed/vmEHCJofslg",
          description: "Getting started with pandas for data analysis"
        },
        readingLesson: {
          id: 2,
          title: "Data Cleaning with Pandas",
          duration: "25 min",
          content: `# Data Cleaning with Pandas

## Introduction

Data cleaning is one of the most important steps in the data analysis process. Pandas provides powerful tools for cleaning and preparing data.

## Common Data Cleaning Tasks:

### 1. Handling Missing Values
- Identify missing values with \`isnull()\` and \`notnull()\`
- Remove missing values with \`dropna()\`
- Fill missing values with \`fillna()\`

### 2. Data Type Conversion
- Convert data types with \`astype()\`
- Handle date/time conversion with \`to_datetime()\`
- Categorical data with \`astype('category')\`

### 3. Removing Duplicates
- Identify duplicates with \`duplicated()\`
- Remove duplicates with \`drop_duplicates()\`

### 4. String Operations
- Text cleaning with \`str\` accessor
- Pattern matching with regular expressions
- String splitting and joining

## Example:

\`\`\`python
import pandas as pd
import numpy as np

# Create sample data
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie', np.nan],
    'age': [25, 30, 35, 28],
    'city': ['New York', 'London', 'Tokyo', 'Paris']
})

# Handle missing values
df['name'] = df['name'].fillna('Unknown')

# Remove duplicates
df = df.drop_duplicates()

# Convert age to integer
df['age'] = df['age'].astype(int)
\`\`\`
`,
          description: "Data cleaning and preparation techniques"
        },
        quizLesson: {
          id: 3,
          title: "Data Analysis Quiz",
          duration: "12 min",
          description: "Test your data analysis skills"
        }
      }
    ],
    quizRequired: true,
    certificateEnabled: true,
    skills: ["Python", "Pandas", "NumPy", "Data Analysis", "Data Cleaning"],
    prerequisites: ["Basic Python", "Statistics basics"],
    tags: ["python", "data science", "pandas", "machine learning"],
    totalLessons: 3,
    estimatedHours: 15
  },
  {
    title: "Business Strategy Fundamentals",
    description: "Learn essential business strategy concepts, competitive analysis, and strategic planning for modern organizations.",
    duration: "6 weeks",
    level: "beginner",
    price: 79,
    rating: 4.7,
    students: 12300,
    instructor: "Jennifer Martinez",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    modules: [
      {
        id: 1,
        title: "Strategic Planning Basics",
        description: "Understanding the fundamentals of business strategy and planning",
        videoLesson: {
          id: 1,
          title: "What is Business Strategy?",
          duration: "20 min",
          videoUrl: "https://www.youtube.com/embed/sB_eLDRdLpc",
          description: "Core concepts of business strategy"
        },
        readingLesson: {
          id: 2,
          title: "SWOT Analysis",
          duration: "18 min",
          content: `# SWOT Analysis

## What is SWOT Analysis?

SWOT Analysis is a strategic planning tool used to identify and analyze the internal and external factors that can impact the success of a business or project.

## The Four Components:

### 1. Strengths (Internal)
- What does your organization do well?
- What unique resources do you have?
- What advantages do you have over competitors?
- Examples: Strong brand, skilled workforce, proprietary technology

### 2. Weaknesses (Internal)
- What could you improve?
- What should you avoid?
- What do competitors do better?
- Examples: Limited resources, weak brand recognition, high costs

### 3. Opportunities (External)
- What market trends can you take advantage of?
- What changes in technology or regulations could benefit you?
- What gaps exist in the market?
- Examples: Growing market, new technologies, changing regulations

### 4. Threats (External)
- What obstacles do you face?
- What are competitors doing?
- Are there changes in regulations or technology that could harm you?
- Examples: Economic downturn, new competitors, changing customer preferences

## How to Conduct SWOT Analysis:

1. **Gather Information**: Collect data from various sources
2. **Brainstorm**: Involve team members from different departments
3. **Organize**: Group items into the four categories
4. **Analyze**: Look for patterns and connections
5. **Prioritize**: Focus on the most important factors
6. **Action Planning**: Develop strategies based on findings

## Benefits:
- Clear understanding of your position
- Identification of opportunities and threats
- Better decision-making
- Strategic planning foundation
`,
          description: "Strategic analysis and planning techniques"
        },
        quizLesson: {
          id: 3,
          title: "Strategy Basics Quiz",
          duration: "8 min",
          description: "Test your understanding of business strategy fundamentals"
        }
      }
    ],
    quizRequired: true,
    certificateEnabled: true,
    skills: ["Strategic Planning", "Business Analysis", "SWOT Analysis", "Competitive Analysis"],
    prerequisites: ["Basic business knowledge"],
    tags: ["business", "strategy", "management", "planning"],
    totalLessons: 3,
    estimatedHours: 12
  }
];

async function seedCourses() {
  try {
    console.log('🌱 Starting course seeding...');

    // Clear existing courses
    await Course.deleteMany({});
    console.log('🗑️ Cleared existing courses');

    // Create sample quizzes first
    const sampleQuizzes = [
      {
        title: "React Fundamentals Quiz",
        description: "Test your React basics knowledge",
        courseId: null, // Will be updated after course creation
        questions: [
          {
            question: "What is JSX?",
            options: [
              "A JavaScript XML syntax",
              "A JavaScript framework",
              "A CSS preprocessor",
              "A database query language"
            ],
            correct: 0,
            explanation: "JSX is a syntax extension for JavaScript that allows you to write HTML-like code in your JavaScript files."
          },
          {
            question: "Which hook is used to manage state in functional components?",
            options: [
              "useEffect",
              "useState",
              "useContext",
              "useReducer"
            ],
            correct: 1,
            explanation: "useState is the hook used to add state to functional components in React."
          }
        ],
        timeLimit: 600, // 10 minutes
        passingScore: 70
      }
    ];

    const createdQuizzes = await Quiz.insertMany(sampleQuizzes);
    console.log(`✅ Created ${createdQuizzes.length} sample quizzes`);

    // Update courses with quiz references
    sampleCourses[0].modules[0].quizLesson.quizId = createdQuizzes[0]._id;

    // Create courses
    const createdCourses = await Course.insertMany(sampleCourses);
    console.log(`✅ Created ${createdCourses.length} sample courses`);

    console.log('🎉 Course seeding completed successfully!');
    console.log(`📊 Created courses: ${createdCourses.map(c => c.title).join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    throw error;
  }
}

module.exports = { seedCourses, sampleCourses };
