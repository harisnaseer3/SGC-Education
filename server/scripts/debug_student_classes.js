const mongoose = require('mongoose');
const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Class = require('../models/Class');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/sgceducation';

async function analyzeStudentClasses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Get all students for 2026-2027
    const students = await Student.find({ academicYear: '2026-2027' })
      .populate('admission', 'class section applicationNumber')
      .lean();

    console.log(`Total Students (2026-2027): ${students.length}`);

    const classCounts = {};
    const studentsWithNoClass = [];

    for (const s of students) {
      if (!s.admission) {
        if (!classCounts['No_Admission_Record']) classCounts['No_Admission_Record'] = 0;
        classCounts['No_Admission_Record']++;
        continue;
      }

      const classId = s.admission.class;
      if (!classId) {
        if (!classCounts['Null_Class_ID']) classCounts['Null_Class_ID'] = 0;
        classCounts['Null_Class_ID']++;
        studentsWithNoClass.push(s.admission.applicationNumber);
        continue;
      }

      const classIdStr = classId.toString();
      if (!classCounts[classIdStr]) classCounts[classIdStr] = 0;
      classCounts[classIdStr]++;
    }

    console.log('\n--- Student Counts by Class ID ---');
    console.log(classCounts);

    // Resolve Class Names
    const classIds = Object.keys(classCounts).filter(k => k !== 'No_Admission_Record' && k !== 'Null_Class_ID');
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const classMap = {};
    classes.forEach(c => classMap[c._id.toString()] = c.name);

    console.log('\n--- Resolved Class Names ---');
    for (const cid of classIds) {
      console.log(`ID ${cid}: ${classMap[cid] || 'UNKOWN_ID_IN_DB'} (Count: ${classCounts[cid]})`);
    }
    
    if (classCounts['Null_Class_ID']) {
       console.log(`\n\nWARNING: ${classCounts['Null_Class_ID']} students have NO Class ID linked.`);
       console.log('Sample App Numbers:', studentsWithNoClass.slice(0, 5));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeStudentClasses();
