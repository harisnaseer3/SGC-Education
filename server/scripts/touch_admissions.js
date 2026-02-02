const mongoose = require('mongoose');
const Admission = require('../models/Admission');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function touchAdmissionsToToday() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find 2026-2027 records that are older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Specifically target the ones we likely just migrated (those with 2026-2027 but old dates)
    const query = {
      academicYear: '2026-2027',
      createdAt: { $lt: thirtyDaysAgo }
    };

    const count = await Admission.countDocuments(query);
    console.log(`Found ${count} admissions with '2026-2027' but old dates (filtered out of Last 30 Days).`);

    if (count > 0) {
       // Update them to NOW
       const result = await Admission.updateMany(query, {
         $set: { 
           createdAt: new Date(),
           updatedAt: new Date()
         }
       });
       console.log(`Successfully updated ${result.modifiedCount} records to Today's date.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

touchAdmissionsToToday();
