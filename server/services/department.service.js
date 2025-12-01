const Department = require('../models/Department');
const Institution = require('../models/Institution');
const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Department Service - Handles department-related business logic
 */
class DepartmentService {
  /**
   * Get all departments (filtered by user role and institution)
   */
  async getAllDepartments(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email')
      .populate('head.userId', 'name email')
      .sort({ createdAt: -1 });

    return departments;
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(departmentId, currentUser) {
    const department = await Department.findById(departmentId)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email')
      .populate('head.userId', 'name email');

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin' &&
        department.institution._id.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied to this department');
    }

    return department;
  }

  /**
   * Create new department
   */
  async createDepartment(departmentData, createdBy) {
    const { institution, code } = departmentData;

    // Verify institution exists
    const institutionDoc = await Institution.findById(institution);
    if (!institutionDoc) {
      throw new ApiError(404, 'Institution not found');
    }

    // Check permissions
    if (createdBy.role !== 'super_admin' &&
        institution.toString() !== createdBy.institution?.toString()) {
      throw new ApiError(403, 'You can only create departments for your institution');
    }

    // Check if department code already exists in this institution
    const existingCode = await Department.findOne({
      code: code.toUpperCase(),
      institution
    });

    if (existingCode) {
      throw new ApiError(400, 'Department code already exists in this institution');
    }

    // Create department
    const department = await Department.create({
      ...departmentData,
      code: code.toUpperCase(),
      createdBy: createdBy.id
    });

    // Update institution stats
    institutionDoc.stats.totalDepartments = await Department.countDocuments({
      institution,
      isActive: true
    });
    await institutionDoc.save();

    return await Department.findById(department._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Update department
   */
  async updateDepartment(departmentId, updateData, currentUser) {
    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        department.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'You can only update departments in your institution');
    }

    // Check if code is being changed and already exists
    if (updateData.code && updateData.code.toUpperCase() !== department.code) {
      const existingCode = await Department.findOne({
        code: updateData.code.toUpperCase(),
        institution: department.institution,
        _id: { $ne: departmentId }
      });

      if (existingCode) {
        throw new ApiError(400, 'Department code already exists in this institution');
      }

      updateData.code = updateData.code.toUpperCase();
    }

    // Update department
    Object.assign(department, updateData);
    await department.save();

    return await Department.findById(department._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email')
      .populate('head.userId', 'name email');
  }

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(departmentId, currentUser) {
    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        department.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'You can only delete departments in your institution');
    }

    // Check if department has associated records
    const studentsCount = await User.countDocuments({
      institution: department.institution,
      // department: departmentId // Uncomment when department field is added to User model
    });

    // For now, just soft delete
    department.isActive = false;
    await department.save();

    // Update institution stats
    const institution = await Institution.findById(department.institution);
    if (institution) {
      institution.stats.totalDepartments = await Department.countDocuments({
        institution: department.institution,
        isActive: true
      });
      await institution.save();
    }

    return { message: 'Department deactivated successfully' };
  }

  /**
   * Toggle department status
   */
  async toggleDepartmentStatus(departmentId, currentUser) {
    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        department.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    department.isActive = !department.isActive;
    await department.save();

    // Update institution stats
    const institution = await Institution.findById(department.institution);
    if (institution) {
      institution.stats.totalDepartments = await Department.countDocuments({
        institution: department.institution,
        isActive: true
      });
      await institution.save();
    }

    return await Department.findById(department._id)
      .populate('institution', 'name type code');
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(departmentId, currentUser) {
    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' &&
        department.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get real-time counts
    const [teachersCount, studentsCount] = await Promise.all([
      User.countDocuments({
        institution: department.institution,
        role: 'teacher',
        isActive: true
        // department: departmentId // Uncomment when added to User model
      }),
      User.countDocuments({
        institution: department.institution,
        role: 'student',
        isActive: true
        // department: departmentId // Uncomment when added to User model
      })
    ]);

    // Update stats
    department.stats.totalTeachers = teachersCount;
    department.stats.totalStudents = studentsCount;
    await department.save();

    return department.stats;
  }

  /**
   * Get departments by institution
   */
  async getDepartmentsByInstitution(institutionId, currentUser) {
    // Check access
    if (currentUser.role !== 'super_admin' &&
        institutionId !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied to this institution');
    }

    const departments = await Department.find({
      institution: institutionId,
      isActive: true
    })
      .populate('head.userId', 'name email')
      .sort({ name: 1 });

    return departments;
  }
}

module.exports = new DepartmentService();
