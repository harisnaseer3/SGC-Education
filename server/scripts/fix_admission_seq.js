const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const SequenceCounter = require('../models/SequenceCounter');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function fixAdmissionSequences() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find all institutions that have admissions
    const institutions = await Admission.distinct('institution');
    console.log(`Found ${institutions.length} institutions with admissions.`);

    for (const instId of institutions) {
      console.log(`\nProcessing Institution: ${instId}`);
      
      // 2. Find the max application number for this institution
      // Fetch all applicationNumbers (as strings) and manually parse to find max Integer
      // Using aggregation might be tricky if strings are mixed, but let's try regex match
      
      const admissions = await Admission.find({ 
        institution: instId,
        applicationNumber: { $exists: true } 
      }).select('applicationNumber').lean();
      
      let maxSeq = 0;
      admissions.forEach(a => {
        const num = parseInt(a.applicationNumber, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      });
      
      console.log(`Max Application Number found: ${maxSeq}`);

      // 3. Update the SequenceCounter
      const result = await SequenceCounter.findOneAndUpdate(
        { institution: instId, type: 'admission' },
        { $set: { seq: maxSeq } },
        { new: true, upsert: true }
      );
      
      console.log(`Updated SequenceCounter to: ${result.seq}`);
    }

    console.log('\nSequence repair complete.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdmissionSequences();
