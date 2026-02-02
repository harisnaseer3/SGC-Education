const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function inspectMigratedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Check Admissions for '2026-2027' created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const admissions = await Admission.find({
      academicYear: '2026-2027',
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('createdAt status isActive personalInfo.name institution')
    .sort({ createdAt: -1 })
    .limit(20);

    console.log(`\n--- Found ${admissions.length} recent '2026-2027' Admissions ---`);
    admissions.forEach(a => {
      console.log(`[${a.createdAt.toISOString().split('T')[0]}] ${a.personalInfo.name} - Status: ${a.status}, Active: ${a.isActive}, Inst: ${a.institution}`);
    });

    // 2. Check Students count matching these admissions
    const admissionIds = admissions.map(a => a._id);
    const students = await Student.find({ admission: { $in: admissionIds } });
    console.log(`\n--- Corresponding Students ---`);
    console.log(`Found ${students.length} Student records for these ${admissions.length} admissions.`);
    if (students.length === 0) {
      console.log(">> EXPLANATION: 'Student Strength' graph queries the Student collection. Since these are 0, the graph will be empty.");
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

inspectMigratedData();
