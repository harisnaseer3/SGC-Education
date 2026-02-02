const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const SequenceCounter = require('../models/SequenceCounter');
const Institution = require('../models/Institution');

// Use env var or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sgceducation';

async function repairLiveData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Migrate Academic Year (2025-2026 -> 2026-2027)
    console.log('\n--- Step 1: Migrating Academic Year ---');
    const updateResult = await Admission.updateMany(
      { academicYear: '2025-2026' },
      { $set: { academicYear: '2026-2027' } }
    );
    console.log(`Migrated ${updateResult.modifiedCount} records from 2025-2026 to 2026-2027.`);

    // 2. Touch Dates (Update imported 2026-2027 records to TODAY for graph visibility)
    console.log('\n--- Step 2: Updating Dates for Graph Visibility ---');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find records with 2026-2027 but old dates (likely imports)
    const dateQuery = {
      academicYear: '2026-2027',
      createdAt: { $lt: thirtyDaysAgo }
    };
    
    const dateUpdateResult = await Admission.updateMany(dateQuery, {
      $set: { 
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }); // Sets to NOW
    console.log(`Updated dates for ${dateUpdateResult.modifiedCount} old imported records to NOW.`);

    // 3. Sync Missing Students (Create Student records for 'enrolled' admissions)
    console.log('\n--- Step 3: Syncing Missing Student Records ---');
    const enrolledAdmissions = await Admission.find({
      status: 'enrolled',
      academicYear: '2026-2027'
    }).lean();
    
    // Check existing
    const admissionIds = enrolledAdmissions.map(a => a._id);
    const existingStudents = await Student.find({ admission: { $in: admissionIds } }).select('admission').lean();
    const existingSet = new Set(existingStudents.map(s => s.admission.toString()));
    const missing = enrolledAdmissions.filter(a => !existingSet.has(a._id.toString()));
    
    console.log(`Found ${missing.length} enrolled admissions missing Student records.`);
    
    let studentCount = 0;
    for (const val of missing) {
       try {
         // Create User if needed
         let user = null;
         const email = val.contactInfo?.email;
         const generatedEmail = `${val.applicationNumber.toString().toLowerCase().replace(/[^a-z0-9]/g, '')}@no-email.system`;
         
         if (email) user = await User.findOne({ email });
         if (!user) {
            user = await User.create({
               name: val.personalInfo?.name || 'Student',
               email: email || generatedEmail,
               password: Math.random().toString(36).slice(-8),
               role: 'student',
               institution: val.institution
            });
         }
         
         await Student.create({
             user: user._id,
             institution: val.institution,
             admission: val._id,
             enrollmentNumber: val.applicationNumber, 
             rollNumber: val.rollNumber,
             admissionDate: val.createdAt || new Date(),
             academicYear: val.academicYear,
             program: val.program || 'General',
             status: 'active',
             isActive: true,
             personalDetails: {
               nationality: val.personalInfo?.nationality || 'Pakistani',
               category: val.personalInfo?.category || 'General'
             },
             guardianInfo: val.guardianInfo,
             createdBy: user._id
         });
         studentCount++;
       } catch (err) {
         if (!err.message.includes('duplicate key')) console.error(`Failed ID ${val._id}: ${err.message}`);
       }
    }
    console.log(`Created ${studentCount} missing Student records.`);

    // 4. Fix Sequence Counters
    console.log('\n--- Step 4: Fixing Sequence Counters ---');
    const institutions = await Admission.distinct('institution');
    for (const instId of institutions) {
      const admissions = await Admission.find({ institution: instId, applicationNumber: { $exists: true } }).select('applicationNumber').lean();
      let maxSeq = 0;
      admissions.forEach(a => {
        const num = parseInt(a.applicationNumber, 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      });
      
      await SequenceCounter.findOneAndUpdate(
        { institution: instId, type: 'admission' },
        { $set: { seq: maxSeq } },
        { new: true, upsert: true }
      );
      console.log(`Updated Sequence for Institution ${instId} to ${maxSeq}`);
    }

    console.log('\nAll repairs completed successfully.');

  } catch (error) {
    console.error('FATAL ERROR:', error);
  } finally {
    await mongoose.disconnect();
  }
}

repairLiveData();
