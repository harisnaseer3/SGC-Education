const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Student = require('../models/Student');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function compareAdmissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Fetch admissions for 2026-2027
    const admissions = await Admission.find({ academicYear: '2026-2027' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('institution', 'name')
      .lean();

    console.log('--- Sample 2026-2027 Admissions ---');
    console.log(JSON.stringify(admissions.map(a => ({
      id: a._id,
      appNum: a.applicationNumber,
      studentName: a.personalInfo?.name,
      institution: a.institution?.name + ` (${a.institution?._id})`,
      academicYear: a.academicYear,
      createdAt: a.createdAt,
      isActive: a.isActive,
      status: a.status
    })), null, 2));

    const countsByYear = await Admission.aggregate([
      { $group: { _id: "$academicYear", count: { $sum: 1 } } }
    ]);
    console.log('--- Counts by Academic Year ---');
    console.log(countsByYear);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

compareAdmissions();
