const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Admission = require('../models/Admission');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const FeeVoucher = require('../models/FeeVoucher');
const FeePayment = require('../models/FeePayment');
const StudentPromotion = require('../models/StudentPromotion');
const Result = require('../models/Result');
const User = require('../models/User');

const repairPermanentDeletion = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Identify Valid Students (those linked to an Admission)
        const admissions = await Admission.find({ studentId: { $exists: true, $ne: null } }).select('studentId');
        const validStudentIds = new Set(admissions.map(a => a.studentId.toString()));
        console.log(`Found ${validStudentIds.size} valid linked students.`);

        // 2. Find Orphaned Students (not in valid list)
        const allStudents = await Student.find({}, '_id user');
        const orphanedStudents = allStudents.filter(s => !validStudentIds.has(s._id.toString()));

        console.log(`Found ${orphanedStudents.length} orphaned students to delete.`);

        if (orphanedStudents.length === 0) {
            console.log('No orphaned students found. Exiting.');
            return;
        }

        let deletedCount = 0;
        
        for (const student of orphanedStudents) {
            const studentId = student._id;
            console.log(`Deleting orphan student: ${studentId}`);

            // Delete related data
            await StudentFee.deleteMany({ student: studentId });
            await FeeVoucher.deleteMany({ student: studentId });
            await FeePayment.deleteMany({ student: studentId });
            await StudentPromotion.deleteMany({ student: studentId });
            await Result.deleteMany({ student: studentId });

            // Delete User if exists
            if (student.user) {
                await User.findByIdAndDelete(student.user);
            }

            // Delete properties
            await Student.findByIdAndDelete(studentId);
            deletedCount++;
        }

        console.log(`Successfully deleted ${deletedCount} orphaned students and their related data.`);

        // 3. Extra Cleanup: Delete StudentFees that reference non-existent students
        // (In case Student was deleted but Fee wasn't)
        const allStudentFees = await StudentFee.find({}, 'student');
        let orphanedFeeCount = 0;
        const validStudentIdsSet = new Set((await Student.find({}, '_id')).map(s => s._id.toString()));
        
        const feeIdsToDelete = [];
        for (const fee of allStudentFees) {
            if (!fee.student || !validStudentIdsSet.has(fee.student.toString())) {
                feeIdsToDelete.push(fee._id);
                orphanedFeeCount++;
            }
        }

        if (feeIdsToDelete.length > 0) {
            console.log(`Found ${feeIdsToDelete.length} orphaned StudentFee records (no Student). Deleting...`);
            await StudentFee.deleteMany({ _id: { $in: feeIdsToDelete } });
            console.log('Deleted orphaned StudentFee records.');
        }

    } catch (error) {
        console.error('Error during repair:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

repairPermanentDeletion();
