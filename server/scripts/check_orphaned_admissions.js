const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admission = require('../models/Admission');
const Student = require('../models/Student');

const fs = require('fs');

const checkOrphanedAdmissions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Get all Student IDs
        const students = await Student.find({}).select('_id');
        const studentIds = new Set(students.map(s => s._id.toString()));

        // 2. Get all Admissions with a studentId
        const admissions = await Admission.find({ studentId: { $exists: true, $ne: null } });

        // 3. Find Orphans (Admission.studentId NOT IN studentIds)
        const orphanedAdmissions = admissions.filter(a => !studentIds.has(a.studentId.toString()));

        let output = `Found ${studentIds.size} total students.\n`;
        output += `Found ${admissions.length} admissions with linked students.\n`;
        output += `\nFound ${orphanedAdmissions.length} orphaned Admissions:\n`;
        
        orphanedAdmissions.forEach(a => {
            output += `- Admission ID: ${a._id}, Student ID Ref: ${a.studentId}, Name: ${a.personalInfo?.name}\n`;
        });

        fs.writeFileSync(path.join(__dirname, 'orphaned_admissions_report.txt'), output);
        console.log('Report written to orphaned_admissions_report.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkOrphanedAdmissions();
