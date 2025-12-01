const departmentService = require('../services/department.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Department Controller - Handles HTTP requests for department management
 */

/**
 * @route   GET /api/v1/departments
 * @desc    Get all departments
 * @access  Private
 */
const getDepartments = asyncHandler(async (req, res) => {
  const { institution, isActive, search } = req.query;

  const departments = await departmentService.getAllDepartments(
    { institution, isActive, search },
    req.user
  );

  res.json({
    success: true,
    count: departments.length,
    data: departments
  });
});

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentById(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: department
  });
});

/**
 * @route   POST /api/v1/departments
 * @desc    Create new department
 * @access  Private (Admin)
 */
const createDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.createDepartment(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: department
  });
});

/**
 * @route   PUT /api/v1/departments/:id
 * @desc    Update department
 * @access  Private (Admin)
 */
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await departmentService.updateDepartment(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Department updated successfully',
    data: department
  });
});

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    Delete department (soft delete)
 * @access  Private (Admin)
 */
const deleteDepartment = asyncHandler(async (req, res) => {
  const result = await departmentService.deleteDepartment(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * @route   PUT /api/v1/departments/:id/toggle-status
 * @desc    Toggle department active status
 * @access  Private (Admin)
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const department = await departmentService.toggleDepartmentStatus(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: `Department ${department.isActive ? 'activated' : 'deactivated'} successfully`,
    data: department
  });
});

/**
 * @route   GET /api/v1/departments/:id/stats
 * @desc    Get department statistics
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await departmentService.getDepartmentStats(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: stats
  });
});

/**
 * @route   GET /api/v1/institutions/:institutionId/departments
 * @desc    Get departments by institution
 * @access  Private
 */
const getDepartmentsByInstitution = asyncHandler(async (req, res) => {
  const departments = await departmentService.getDepartmentsByInstitution(
    req.params.institutionId,
    req.user
  );

  res.json({
    success: true,
    count: departments.length,
    data: departments
  });
});

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  toggleStatus,
  getStats,
  getDepartmentsByInstitution
};
