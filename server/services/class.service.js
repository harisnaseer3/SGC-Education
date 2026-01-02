const Class = require('../models/Class');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

/**
 * Class Service - Handles class-related business logic
 */
class ClassService {
  /**
   * Get all classes (filtered by user role and institution)
   */
  async getAllClasses(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = extractInstitutionId(filters.institution);
    }

    // Apply additional filters
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const classes = await Class.find(query)
      .populate('institution', 'name type code')
      .populate('group', 'name code')
      .populate('feeType', 'name code amount')
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ level: 1, name: 1 });

    return classes;
  }

  /**
   * Get class by ID
   */
  async getClassById(classId, currentUser) {
    const classDoc = await Class.findById(classId)
      .populate('institution', 'name type code')
      .populate('group', 'name code')
      .populate('feeType', 'name code amount')
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || classDoc.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    return classDoc;
  }

  /**
   * Create new class
   */
  async createClass(classData, currentUser) {
    // Ensure institution is set (for non-super-admins, default to their institution)
    if (!classData.institution) {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        classData.institution = institutionId;
      } else {
        throw new ApiError(400, 'Institution is required');
      }
    }

    // Handle case where institution might be sent as an object or stringified object
    if (typeof classData.institution === 'object' && classData.institution._id) {
      classData.institution = classData.institution._id;
    } else if (typeof classData.institution === 'string') {
      // Try to parse if it's a stringified JSON object
      try {
        const parsed = JSON.parse(classData.institution);
        if (parsed && parsed._id) {
          classData.institution = parsed._id;
        }
      } catch (e) {
        // If parsing fails, assume it's already an ID string
        // Keep it as is
      }
    }
    
    // Ensure institution is a valid ObjectId string
    if (!classData.institution || (typeof classData.institution !== 'string' && !classData.institution.toString)) {
      throw new ApiError(400, 'Invalid institution ID');
    }
    
    // Convert to string if it's not already
    classData.institution = String(classData.institution);

    classData.createdBy = currentUser._id;

    // Prevent duplicate class codes within same institution & academic year
    const duplicateFilter = {
      code: classData.code.toUpperCase(),
      institution: classData.institution,
      academicYear: classData.academicYear
    };

    const existing = await Class.findOne(duplicateFilter);
    if (existing) {
      throw new ApiError(400, 'Class code already exists for this academic year');
    }

    const newClass = await Class.create(classData);

    return await Class.findById(newClass._id)
      .populate('institution', 'name type code')
      .populate('group', 'name code')
      .populate('feeType', 'name code amount')
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email');
  }

  /**
   * Update class
   */
  async updateClass(classId, updateData, currentUser) {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || classDoc.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // If code is being updated, check for duplicates
    if (updateData.code) {
      const existingClass = await Class.findOne({
        code: updateData.code.toUpperCase(),
        institution: classDoc.institution,
        academicYear: updateData.academicYear || classDoc.academicYear,
        _id: { $ne: classId }
      });

      if (existingClass) {
        throw new ApiError(400, 'Class code already exists for this academic year');
      }
    }

    Object.assign(classDoc, updateData);
    await classDoc.save();

    return await Class.findById(classId)
      .populate('institution', 'name type code')
      .populate('group', 'name code')
      .populate('feeType', 'name code amount')
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email');
  }

  /**
   * Delete class
   */
  async deleteClass(classId, currentUser) {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || classDoc.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    await Class.findByIdAndDelete(classId);
    return { message: 'Class deleted successfully' };
  }

  /**
   * Toggle class status
   */
  async toggleClassStatus(classId, currentUser) {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || classDoc.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    classDoc.isActive = !classDoc.isActive;
    await classDoc.save();

    return classDoc;
  }
}

module.exports = new ClassService();

