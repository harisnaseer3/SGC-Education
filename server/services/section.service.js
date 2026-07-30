const Section = require('../models/Section');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

/**
 * Section Service - Handles section-related business logic
 */
class SectionService {
  /**
   * Get all sections (filtered by user role and institution)
   */
  async getAllSections(filters = {}, currentUser) {
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
    if (filters.class) query.class = filters.class;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const sections = await Section.find(query)
      .populate('institution', 'name type code')
      .populate({
        path: 'class',
        select: 'name code level'
      })
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ 'class.level': 1, code: 1 });

    if (sections.length === 0) return [];

    // Compute live active student count per section
    const sectionIds = sections.map(s => s._id);
    const studentCounts = await Student.aggregate([
      {
        $match: {
          section: { $in: sectionIds },
          isActive: true,
          status: { $nin: ['cancelled', 'rejected'] }
        }
      },
      {
        $group: {
          _id: '$section',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = new Map();
    studentCounts.forEach(item => {
      if (item._id) {
        countMap.set(item._id.toString(), item.count);
      }
    });

    return sections.map(sec => {
      const secObj = sec.toObject ? sec.toObject() : { ...sec };
      const liveCount = countMap.get(sec._id.toString()) || 0;
      secObj.stats = {
        ...secObj.stats,
        totalStudents: liveCount
      };
      return secObj;
    });
  }

  /**
   * Get section by ID
   */
  async getSectionById(sectionId, currentUser) {
    const section = await Section.findById(sectionId)
      .populate('institution', 'name type code')
      .populate({
        path: 'class',
        select: 'name code level'
      })
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || section.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const liveCount = await Student.countDocuments({
      section: section._id,
      isActive: true,
      status: { $nin: ['cancelled', 'rejected'] }
    });

    const secObj = section.toObject();
    secObj.stats = {
      ...secObj.stats,
      totalStudents: liveCount
    };

    return secObj;
  }

  /**
   * Create new section
   */
  async createSection(sectionData, currentUser) {
    // Verify class exists and user has access
    const classDoc = await Class.findById(sectionData.class);
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

    // Set institution from class
    sectionData.institution = classDoc.institution;
    sectionData.createdBy = currentUser._id;

    if (!sectionData.academicYear || String(sectionData.academicYear).trim() === '') {
      sectionData.academicYear = 'All';
    }

    // Check for duplicate code
    const existingSection = await Section.findOne({
      code: sectionData.code.toUpperCase(),
      class: sectionData.class,
      academicYear: sectionData.academicYear
    });

    if (existingSection) {
      throw new ApiError(400, 'Section code already exists for this class and academic year');
    }

    const newSection = await Section.create(sectionData);

    // Update class stats
    await Class.findByIdAndUpdate(sectionData.class, {
      $inc: { 'stats.totalSections': 1 }
    });

    return await Section.findById(newSection._id)
      .populate('institution', 'name type code')
      .populate({
        path: 'class',
        select: 'name code level'
      })
      .populate('classTeacher.userId', 'name email');
  }

  /**
   * Update section
   */
  async updateSection(sectionId, updateData, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || section.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // If code is being updated, check for duplicates
    if (updateData.code) {
      const existingSection = await Section.findOne({
        code: updateData.code.toUpperCase(),
        class: updateData.class || section.class,
        academicYear: updateData.academicYear || section.academicYear,
        _id: { $ne: sectionId }
      });

      if (existingSection) {
        throw new ApiError(400, 'Section code already exists for this class and academic year');
      }
    }

    Object.assign(section, updateData);
    await section.save();

    return await Section.findById(sectionId)
      .populate('institution', 'name type code')
      .populate({
        path: 'class',
        select: 'name code level'
      })
      .populate('classTeacher.userId', 'name email');
  }

  /**
   * Delete section
   */
  async deleteSection(sectionId, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || section.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // Update class stats
    await Class.findByIdAndUpdate(section.class, {
      $inc: { 'stats.totalSections': -1 }
    });

    await Section.findByIdAndDelete(sectionId);
    return { message: 'Section deleted successfully' };
  }

  /**
   * Toggle section status
   */
  async toggleSectionStatus(sectionId, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || section.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    section.isActive = !section.isActive;
    await section.save();

    return section;
  }
}

module.exports = new SectionService();

