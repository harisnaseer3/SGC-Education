const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Student = require('../models/Student');
const admissionService = require('../services/admission.service');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function testAnalytics() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test for Last 7 Days (easier to read)
    const result = await admissionService.getAdmissionAnalytics({
      days: 7,
      timezone: 'Asia/Karachi'
    }, { role: 'super_admin' }); // Mock user

    console.log('--- Status Trends Output (Last 7 Days) ---');
    // Group by date for display
    const grouped = {};
    result.statusTrends.forEach(item => {
      if (!grouped[item.date]) grouped[item.date] = [];
      grouped[item.date].push(`${item.status}: ${item.count}`);
    });
    
    console.log(JSON.stringify(grouped, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAnalytics();
