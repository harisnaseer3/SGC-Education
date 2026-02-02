const mongoose = require('mongoose');
const Admission = require('../models/Admission');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkStatusDistribution() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const distribution = await Admission.aggregate([
    { $match: { academicYear: '2026-2027' } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  
  console.log('--- Status Distribution 2026-2027 ---');
  console.log(distribution);
  
  await mongoose.disconnect();
}

checkStatusDistribution();
