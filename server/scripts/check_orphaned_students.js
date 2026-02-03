const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admission = require('../models/Admission');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');

const checkOrphanedStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get all linked Student IDs from Admissions
        const admissions = await Admission.find({ studentId: { $exists: true, $ne: null } }).select('studentId');
        const linkedStudentIds = new Set(admissions.map(a => a.studentId.toString()));
        console.log(`Found ${linkedStudentIds.size} linked students in Admissions.`);

        // 2. Get all Students
        const students = await Student.find({}, '_id personalInfo.name rollNumber');
        console.log(`Found ${students.length} total students in Student collection.`);

        // 3. Find Orphans
        const orphans = students.filter(s => !linkedStudentIds.has(s._id.toString()));

        console.log(`\nFound ${orphans.length} orphaned students (no Admission record):`);
        orphans.forEach(o => {
            console.log(`- ID: ${o._id}, Name: ${o.personalInfo?.name}, Roll: ${o.rollNumber}`);
        });

        // 4. Check for orphaned StudentFee records (optional but good to know)
        // const distinctFeeStudents = await StudentFee.distinct('student');
        // console.log(`\nStudentFee records reference ${distinctFeeStudents.length} distinct students.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkOrphanedStudents();
