const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admission = require('../models/Admission');
const Student = require('../models/Student');

const clearAdmissions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Double check Student count
        const studentCount = await Student.countDocuments();
        console.log(`Current Student count: ${studentCount}`);

        if (studentCount > 0) {
            console.log('WARNING: There are Students in the database. Aborting full wipe of Admissions to prevent data inconsistency.');
            console.log('Please manualy check which admissions to delete.');
            return;
        }

        // 2. Count Admissions
        const admissionCount = await Admission.countDocuments();
        console.log(`Found ${admissionCount} Admissions.`);

        if (admissionCount === 0) {
            console.log('Admissions collection is already empty.');
            return;
        }

        // 3. Delete All Admissions
        console.log('Deleting all Admission records...');
        await Admission.deleteMany({});
        console.log(`Successfully deleted ${admissionCount} Admission records.`);
        console.log('Database should now be clean for re-import.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

clearAdmissions();
