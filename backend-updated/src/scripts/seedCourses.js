require('dotenv').config();
const mongoose = require('mongoose');
const { seedCourses } = require('../seeders/courseSeeder');

async function runSeeder() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/welx');
    console.log('✅ Connected to MongoDB');

    await seedCourses();

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeeder();
