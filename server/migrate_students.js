const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Assuming this is run from the root directory or scripts directory
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

const migrate = async () => {
  await connectDB();
  const db = mongoose.connection.db;

  console.log('Starting migration...');

  const admissionsCol = db.collection('admissions');
  const studentsCol = db.collection('students');
  const usersCol = db.collection('users');
  const unifiedStudentsCol = db.collection('students_v2');

  // Create unified_students collection if not exists
  const collections = await db.listCollections().toArray();
  if (!collections.some(c => c.name === 'students_v2')) {
    await db.createCollection('students_v2');
  } else {
    // Clear it if we are re-running
    await unifiedStudentsCol.deleteMany({});
  }

  // Also clear MigrationMap
  if (collections.some(c => c.name === 'migration_maps')) {
    await db.collection('migration_maps').deleteMany({});
  } else {
    await db.createCollection('migration_maps');
  }
  const migrationMapCol = db.collection('migration_maps');

  const admissions = await admissionsCol.find({}).toArray();
  console.log(`Found ${admissions.length} admissions to migrate`);

  let migratedCount = 0;

  for (const admission of admissions) {
    // Map status
    let newStatus = 'pending';
    if (['approved', 'enrolled'].includes(admission.status)) {
      newStatus = 'enrolled';
    } else if (['struck_off', 'cancelled', 'rejected'].includes(admission.status)) {
      newStatus = 'struckoff';
    }

    // Build the new unified student object
    const unifiedStudent = {
      _id: new mongoose.Types.ObjectId(), // Create a brand new ID
      institution: admission.institution,
      applicationNumber: admission.applicationNumber,
      enrollmentNumber: null,
      rollNumber: admission.rollNumber,
      academicYear: admission.academicYear,
      program: admission.program,
      class: admission.class,
      section: admission.section,
      batch: null,
      admissionDate: admission.admissionDate,
      admissionEffectiveDate: admission.admissionEffectiveDate,

      personalDetails: {
        name: admission.personalInfo?.name,
        dateOfBirth: admission.personalInfo?.dateOfBirth,
        gender: admission.personalInfo?.gender,
        bloodGroup: admission.personalInfo?.bloodGroup,
        nationality: admission.personalInfo?.nationality || 'Pakistani',
        religion: admission.personalInfo?.religion,
        category: admission.personalInfo?.category
      },

      contactDetails: admission.contactInfo || {},
      guardianInfo: admission.guardianInfo || {},
      academicBackground: admission.academicBackground || {},
      documents: admission.documents || [],
      
      status: newStatus,
      statusHistory: admission.statusHistory || [],
      
      reviewedBy: admission.reviewedBy,
      reviewedAt: admission.reviewedAt,
      reviewRemarks: admission.reviewRemarks,
      
      applicationFee: admission.applicationFee || { amount: 0, paid: false },
      
      isActive: admission.isActive,
      createdBy: admission.createdBy,
      createdAt: admission.createdAt || new Date(),
      updatedAt: admission.updatedAt || new Date()
    };

    // If there is an associated student record
    let oldStudentId = null;
    let oldUserId = null;

    if (admission.studentId) {
      const student = await studentsCol.findOne({ _id: admission.studentId });
      if (student) {
        oldStudentId = student._id;
        oldUserId = student.user;

        // Merge student data
        unifiedStudent.enrollmentNumber = student.enrollmentNumber || unifiedStudent.enrollmentNumber;
        if (!unifiedStudent.rollNumber) unifiedStudent.rollNumber = student.rollNumber;
        unifiedStudent.batch = student.batch;
        unifiedStudent.stats = student.stats || {};
        unifiedStudent.currentSemester = student.currentSemester;
        unifiedStudent.currentYear = student.currentYear;
        
        // Merge personal details
        if (student.personalDetails) {
          unifiedStudent.personalDetails.middleName = student.personalDetails.middleName;
          unifiedStudent.personalDetails.aadharNumber = student.personalDetails.aadharNumber;
          unifiedStudent.personalDetails.photo = student.personalDetails.photo;
        }

        // If the student status is not active, maybe override the unified status?
        if (student.status === 'struck_off') {
          unifiedStudent.status = 'struckoff';
        } else if (student.status === 'graduated') {
          unifiedStudent.status = 'passout';
        } else if (student.status === 'active' && newStatus !== 'enrolled') {
          unifiedStudent.status = 'enrolled';
        }
      }
    }

    await unifiedStudentsCol.insertOne(unifiedStudent);
    
    // Save to migration map
    await migrationMapCol.insertOne({
      oldAdmissionId: admission._id,
      oldStudentId: oldStudentId,
      oldUserId: oldUserId,
      newStudentId: unifiedStudent._id
    });

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} documents to students_v2.`);

  console.log('Now updating foreign keys in other collections...');

  // Update FeeVouchers
  const feeVouchers = await db.collection('feevouchers').find({}).toArray();
  let updatedVouchers = 0;
  for (const v of feeVouchers) {
    let mapEntry = null;
    if (v.student) {
      mapEntry = await migrationMapCol.findOne({ oldStudentId: v.student });
    }
    if (!mapEntry && v.admission) {
      mapEntry = await migrationMapCol.findOne({ oldAdmissionId: v.admission });
    }

    if (mapEntry) {
      await db.collection('feevouchers').updateOne(
        { _id: v._id },
        { 
          $set: { student: mapEntry.newStudentId },
          $unset: { admission: "" } // remove admission ref
        }
      );
      updatedVouchers++;
    }
  }
  console.log(`Updated ${updatedVouchers} fee vouchers.`);

  // Update StudentFee
  const studentFees = await db.collection('studentfees').find({}).toArray();
  let updatedFees = 0;
  for (const f of studentFees) {
    const mapEntry = await migrationMapCol.findOne({ oldStudentId: f.student });
    if (mapEntry) {
      await db.collection('studentfees').updateOne(
        { _id: f._id },
        { $set: { student: mapEntry.newStudentId } }
      );
      updatedFees++;
    }
  }
  console.log(`Updated ${updatedFees} student fees.`);

  // Update FeePayment
  const feePayments = await db.collection('feepayments').find({}).toArray();
  let updatedPayments = 0;
  for (const p of feePayments) {
    const mapEntry = await migrationMapCol.findOne({ oldStudentId: p.student });
    if (mapEntry) {
      await db.collection('feepayments').updateOne(
        { _id: p._id },
        { $set: { student: mapEntry.newStudentId } }
      );
      updatedPayments++;
    }
  }
  console.log(`Updated ${updatedPayments} fee payments.`);

  // Update Result
  const results = await db.collection('results').find({}).toArray();
  let updatedResults = 0;
  for (const r of results) {
    const mapEntry = await migrationMapCol.findOne({ oldStudentId: r.student });
    if (mapEntry) {
      await db.collection('results').updateOne(
        { _id: r._id },
        { $set: { student: mapEntry.newStudentId } }
      );
      updatedResults++;
    }
  }
  console.log(`Updated ${updatedResults} results.`);

  // Update StudentPromotion
  const studentPromotions = await db.collection('studentpromotions').find({}).toArray();
  let updatedPromotions = 0;
  for (const p of studentPromotions) {
    const mapEntry = await migrationMapCol.findOne({ oldStudentId: p.student });
    if (mapEntry) {
      await db.collection('studentpromotions').updateOne(
        { _id: p._id },
        { 
          $set: { student: mapEntry.newStudentId },
          $unset: { admission: "" }
        }
      );
      updatedPromotions++;
    }
  }
  console.log(`Updated ${updatedPromotions} student promotions.`);

  // Cleanup Users (remove student users)
  const deletedUsers = await usersCol.deleteMany({ role: 'student' });
  console.log(`Deleted ${deletedUsers.deletedCount} student users.`);

  // Rename collections
  console.log('Renaming collections to finalize cutover...');
  await admissionsCol.rename('admissions_old');
  await studentsCol.rename('students_old');
  await unifiedStudentsCol.rename('students');

  console.log('Migration completed successfully!');
  process.exit(0);
};

migrate().catch(console.error);
