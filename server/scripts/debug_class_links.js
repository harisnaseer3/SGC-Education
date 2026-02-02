const mongoose = require('mongoose');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const Class = require('../models/Class');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function checkClassLinks() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find Enrolled students created in last 7 days from imports (2026-2027)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30); // Widen to 30 days just in case

    const students = await Student.find({
      academicYear: '2026-2027',
      admissionDate: { $gte: sevenDaysAgo }
    })
    .populate('admission', 'class section status')
    .limit(50);

    console.log(`Found ${students.length} recent enrolled students (2026-2027).`);

    let brokenLinks = 0;
    
    for (const s of students) {
      if (!s.admission) {
        console.log(`[Broken] Student ${s._id}: No Admission record found.`);
        brokenLinks++;
        continue;
      }
      
      const classId = s.admission.class;
      if (!classId) {
        console.log(`[Broken] Student ${s._id}: Admission ${s.admission._id} has NO Class ID.`);
        brokenLinks++;
        continue;
      }

      const cls = await Class.findById(classId);
      if (!cls) {
         console.log(`[Broken] Student ${s._id}: Linked Class ID ${classId} NOT FOUND in Classes collection.`);
         brokenLinks++;
      }
    }

    if (brokenLinks === 0) {
      console.log('All checked students have valid Class links.');
    } else {
      console.log(`Found ${brokenLinks} students with broken class links.`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkClassLinks();
