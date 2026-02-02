const mongoose = require('mongoose');
const Admission = require('../models/Admission');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkCurrentYearDistribution() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const totalCurrYear = await Admission.countDocuments({ academicYear: '2026-2027' });
    console.log(`Total 2026-2027 Admissions: ${totalCurrYear}`);

    const distribution = await Admission.aggregate([
      { $match: { academicYear: '2026-2027' } },
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

    console.log('--- Date Distribution for 2026-2027 ---');
    console.log(distribution);
    
    // Check how many are within last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = await Admission.countDocuments({ 
        academicYear: '2026-2027',
        createdAt: { $gte: thirtyDaysAgo }
    });
    console.log(`Records within Last 30 Days: ${recentCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCurrentYearDistribution();
