const mongoose = require('mongoose');
const Admission = require('../models/Admission');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkDateDistribution() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const distribution = await Admission.aggregate([
      { $match: { academicYear: '2025-2026' } },
      { 
        $group: { 
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    console.log('--- Date Distribution for 2025-2026 ---');
    console.log(distribution);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDateDistribution();
