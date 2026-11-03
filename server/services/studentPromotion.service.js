const StudentPromotion = require('../models/StudentPromotion');
const Student = require('../models/Student');
const Admission = require('../models/Student');
const SequenceCounter = require('../models/SequenceCounter');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');
const feeService = require('./fee.service');

/**
 * Student Promotion Service - Handles promotion, transfer, and passout operations
 */
class StudentPromotionService {
  /**
   * Process student promotion/transfer/passout
   */
  async processStudentOperation(operationData, currentUser) {
    const { promotionType, studentIds, from, to, remarks } = operationData;

    if (!studentIds || studentIds.length === 0) {
      throw new ApiError(400, 'Please select at least one student');
    }

    const results = [];
    const errors = [];

    for (const admissionId of studentIds) {
      try {
        // Get admission record
        const admission = await Admission.findById(admissionId)
          .populate('class')
          .populate('section')
          .populate('institution');

        if (!admission) {
          errors.push({ admissionId, error: 'Admission not found' });
          continue;
        }

        // Check if admission is enrolled or active
        if (admission.status !== 'enrolled' && admission.status !== 'active') {
          errors.push({ 
            admissionId, 
            error: `Student is not enrolled. Current status: ${admission.status}` 
          });
          continue;
        }

        // Get student record (Admission is Student model in unified schema)
        const student = (admission.studentId ? await Student.findById(admission.studentId) : null) || admission;

        let updatedStudent;
        let updatedAdmission;

        if (promotionType === 'promote') {
          // PROMOTE: Same institution, different class
          // Status: Student stays 'active', Admission stays 'enrolled'
          // Update: class, section, group, academicYear
          
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              class: to.class,
              section: to.section,
              academicYear: to.academicYear || admission.academicYear,
              status: 'active', // Keep active
              updatedAt: Date.now()
            },
            { new: true }
          );

          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              class: to.class,
              section: to.section,
              status: 'enrolled', // Keep enrolled
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Automatically assign fee structure for the new class
          try {
            await feeService.assignFeeStructure({
              studentId: student._id,
              classId: to.class,
              discount: 0,
              discountType: 'amount',
              discountReason: 'Auto-assigned on promotion',
              feeHeadDiscounts: {}
            }, currentUser);
          } catch (feeError) {
            // Log error but don't fail the promotion if fee assignment fails
            // This could happen if no fee structure exists for the class, or if already assigned
            console.warn(`Failed to auto-assign fee structure for student ${student._id} to class ${to.class}:`, feeError.message);
          }

        } else if (promotionType === 'transfer') {
          // TRANSFER: Different institution
          // Transfer student to new institution with enrolled status so they remain active.
          // Resolve any duplicate key collisions (applicationNumber, enrollmentNumber, rollNumber)
          // at the destination institution by allocating new sequence numbers.
          const toInstitutionId = to.institution;
          const studentUpdateFields = {
            institution: toInstitutionId,
            class: to.class,
            section: to.section,
            academicYear: to.academicYear || admission.academicYear,
            status: 'enrolled',
            isActive: true,
            updatedAt: Date.now()
          };

          // Check applicationNumber conflict at destination institution
          let targetAppNumber = student.applicationNumber;
          const appConflict = await Student.findOne({
            institution: toInstitutionId,
            applicationNumber: targetAppNumber,
            _id: { $ne: student._id }
          });
          if (appConflict || !targetAppNumber) {
            const allStudents = await Student.find(
              { institution: toInstitutionId, applicationNumber: { $exists: true, $ne: null } },
              { applicationNumber: 1 }
            );
            let maxAppNum = 0;
            allStudents.forEach(s => {
              const num = parseInt(s.applicationNumber, 10);
              if (!isNaN(num) && num > maxAppNum) maxAppNum = num;
            });
            let counter = await SequenceCounter.findOne({ institution: toInstitutionId, type: 'admission' });
            if (!counter || counter.seq < maxAppNum) {
              counter = await SequenceCounter.findOneAndUpdate(
                { institution: toInstitutionId, type: 'admission' },
                { $set: { seq: maxAppNum } },
                { new: true, upsert: true }
              );
            }
            counter = await SequenceCounter.findOneAndUpdate(
              { institution: toInstitutionId, type: 'admission' },
              { $inc: { seq: 1 } },
              { new: true, upsert: true }
            );
            studentUpdateFields.applicationNumber = String(counter.seq);
          }

          // Check enrollmentNumber conflict at destination institution
          let targetEnrNumber = student.enrollmentNumber;
          const enrConflict = await Student.findOne({
            institution: toInstitutionId,
            enrollmentNumber: targetEnrNumber,
            _id: { $ne: student._id }
          });
          if (enrConflict || !targetEnrNumber) {
            const allStudents = await Student.find(
              { institution: toInstitutionId, enrollmentNumber: { $exists: true, $ne: null } },
              { enrollmentNumber: 1 }
            );
            let maxEnrNum = 0;
            allStudents.forEach(s => {
              const num = parseInt(s.enrollmentNumber, 10);
              if (!isNaN(num) && num > maxEnrNum) maxEnrNum = num;
            });
            let counter = await SequenceCounter.findOne({ institution: toInstitutionId, type: 'enrollment' });
            if (!counter || counter.seq < maxEnrNum) {
              counter = await SequenceCounter.findOneAndUpdate(
                { institution: toInstitutionId, type: 'enrollment' },
                { $set: { seq: maxEnrNum } },
                { new: true, upsert: true }
              );
            }
            counter = await SequenceCounter.findOneAndUpdate(
              { institution: toInstitutionId, type: 'enrollment' },
              { $inc: { seq: 1 } },
              { new: true, upsert: true }
            );
            studentUpdateFields.enrollmentNumber = String(counter.seq);
          }

          // Check rollNumber conflict at destination institution
          let targetRollNumber = student.rollNumber;
          const rollConflict = await Student.findOne({
            institution: toInstitutionId,
            rollNumber: targetRollNumber,
            _id: { $ne: student._id }
          });
          if (rollConflict || !targetRollNumber) {
            const allStudents = await Student.find(
              { institution: toInstitutionId, rollNumber: { $exists: true, $ne: null } },
              { rollNumber: 1 }
            );
            let maxRollNum = 99;
            allStudents.forEach(s => {
              const num = parseInt(s.rollNumber, 10);
              if (!isNaN(num) && num > maxRollNum) maxRollNum = num;
            });
            studentUpdateFields.rollNumber = String(maxRollNum + 1);
          }

          // Update student document
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            studentUpdateFields,
            { new: true }
          );

          // Update admission document to match new campus
          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              status: 'enrolled',
              isActive: true,
              institution: toInstitutionId,
              class: to.class,
              section: to.section,
              academicYear: to.academicYear || admission.academicYear,
              applicationNumber: studentUpdateFields.applicationNumber || admission.applicationNumber,
              enrollmentNumber: studentUpdateFields.enrollmentNumber || admission.enrollmentNumber,
              rollNumber: studentUpdateFields.rollNumber || admission.rollNumber,
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Automatically assign fee structure for the new class at the new institution
          try {
            await feeService.assignFeeStructure({
              studentId: student._id,
              classId: to.class,
              discount: 0,
              discountType: 'amount',
              discountReason: 'Auto-assigned on transfer',
              feeHeadDiscounts: {}
            }, currentUser);
          } catch (feeError) {
            console.warn(`Failed to auto-assign fee structure for student ${student._id} to class ${to.class}:`, feeError.message);
          }

        } else if (promotionType === 'passout') {
          // PASS OUT: Student completes last class
          // Status: Mark both student and admission records as 'passout'
          
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              status: 'passout',
              isActive: false,
              updatedAt: Date.now()
            },
            { new: true }
          );

          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              status: 'passout',
              isActive: true, // Keep admission record active (not soft-deleted)
              updatedAt: Date.now()
            },
            { new: true }
          );
        }

        // Create promotion record
        const promotionRecord = await StudentPromotion.create({
          student: student._id,
          operationType: promotionType,
          from: {
            institution: from.institution,
            class: from.class,
            section: from.section,
            group: (from.group && mongoose.Types.ObjectId.isValid(from.group)) ? from.group : undefined,
            academicYear: from.academicYear || admission.academicYear || student.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
          },
          to: to ? {
            institution: to.institution || null,
            class: to.class || null,
            section: to.section || null,
            group: (to.group && mongoose.Types.ObjectId.isValid(to.group)) ? to.group : undefined,
            academicYear: to.academicYear || null
          } : null,
          operationDate: new Date(),
          effectiveDate: new Date(),
          remarks: remarks || '',
          status: 'completed',
          performedBy: currentUser._id
        });

        results.push({
          admissionId,
          studentId: student._id,
          promotionId: promotionRecord._id,
          success: true
        });

      } catch (error) {
        console.error(`Error processing student ${admissionId}:`, error);
        errors.push({ 
          admissionId, 
          error: error.message || 'Failed to process student operation' 
        });
      }
    }

    return {
      success: results.length > 0,
      processed: results.length,
      total: studentIds.length,
      results,
      errors
    };
  }

  /**
   * Get promotion history for a student
   */
  async getStudentPromotionHistory(studentId, currentUser) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || student.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const promotions = await StudentPromotion.find({ student: studentId })
      .populate('from.institution', 'name code')
      .populate('from.class', 'name code')
      .populate('from.section', 'name code')
      .populate('to.institution', 'name code')
      .populate('to.class', 'name code')
      .populate('to.section', 'name code')
      .populate('performedBy', 'name email')
      .sort({ operationDate: -1 });

    return promotions;
  }

  /**
   * Get all promotions/transfers/passouts with filters
   */
  async getAllPromotions(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query['from.institution'] = institutionId;
      }
    } else if (filters.institution) {
      query['from.institution'] = extractInstitutionId(filters.institution);
    }

    // Apply operation type filter
    if (filters.operationType) {
      query.operationType = filters.operationType;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.operationDate = {};
      if (filters.startDate) {
        query.operationDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.operationDate.$lte = new Date(filters.endDate);
      }
    }

    const promotions = await StudentPromotion.find(query)
      .populate('student', 'enrollmentNumber rollNumber applicationNumber admissionNo name personalDetails')
      .populate('from.institution', 'name code')
      .populate('from.class', 'name code')
      .populate('from.section', 'name code')
      .populate('to.institution', 'name code')
      .populate('to.class', 'name code')
      .populate('to.section', 'name code')
      .populate('performedBy', 'name email')
      .sort({ operationDate: -1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0);

    const total = await StudentPromotion.countDocuments(query);

    return {
      data: promotions,
      total,
      page: filters.page || 1,
      limit: filters.limit || 100
    };
  }
}

module.exports = new StudentPromotionService();

