const mongoose = require('mongoose');
const Admission = require('../models/Admission');

// Mock User if needed, or just import models to query directly
const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkLatestAdmissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const recentAdmissions = await Admission.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('createdAt status applicationNumber institution');

    console.log('--- Latest 10 Admissions ---');
    recentAdmissions.forEach(adm => {
      console.log(`ID: ${adm._id}, Date: ${adm.createdAt.toISOString()}, Status: ${adm.status}, Inst: ${adm.institution}`);
    });

    // Also check active count for last 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const count = await Admission.countDocuments({
      createdAt: { $gte: tenDaysAgo }
    });
    console.log(`\nTotal admissions in last 10 days: ${count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLatestAdmissions();
