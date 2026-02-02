const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Student = require('../models/Student');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function migrateAcademicYear() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find ALL admissions with incorrect year
    const query = {
      academicYear: '2025-2026'
    };

    const count = await Admission.countDocuments(query);
    console.log(`Found ${count} admissions to migrate from 2025-2026 to 2026-2027.`);

    if (count > 0) {
      const result = await Admission.updateMany(query, {
        $set: { 
          academicYear: '2026-2027',
          isActive: true
        }
      });
      console.log(`Successfully updated ${result.modifiedCount} records.`);
    }

  } catch (error) {
    console.error('Migration Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateAcademicYear();
