const organizationService = require('../services/organization.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Organization Controller - Handles HTTP requests for organization management
 */

/**
 * @route   GET /api/v1/organizations
 * @desc    Get all organizations
 * @access  Private (Super Admin)
 */
const getOrganizations = asyncHandler(async (req, res) => {
  const { type, isActive, search } = req.query;

  const organizations = await organizationService.getAllOrganizations(
    { type, isActive, search },
    req.user
  );

  res.json({
    success: true,
    count: organizations.length,
    data: organizations
  });
});

/**
 * @route   GET /api/v1/organizations/:id
 * @desc    Get organization by ID
 * @access  Private (Super Admin)
 */
const getOrganizationById = asyncHandler(async (req, res) => {
  const organization = await organizationService.getOrganizationById(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: organization
  });
});

/**
 * @route   POST /api/v1/organizations
 * @desc    Create new organization
 * @access  Private (Super Admin only)
 */
const createOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.createOrganization(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Organization created successfully',
    data: organization
  });
});

/**
 * @route   PUT /api/v1/organizations/:id
 * @desc    Update organization
 * @access  Private (Super Admin only)
 */
const updateOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateOrganization(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Organization updated successfully',
    data: organization
  });
});

/**
 * @route   DELETE /api/v1/organizations/:id
 * @desc    Delete organization
 * @access  Private (Super Admin only)
 */
const deleteOrganization = asyncHandler(async (req, res) => {
  const result = await organizationService.deleteOrganization(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * @route   PUT /api/v1/organizations/:id/toggle-status
 * @desc    Toggle organization active status
 * @access  Private (Super Admin only)
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const organization = await organizationService.toggleOrganizationStatus(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: `Organization ${organization.isActive ? 'activated' : 'deactivated'} successfully`,
    data: organization
  });
});

/**
 * @route   GET /api/v1/organizations/:id/stats
 * @desc    Get organization statistics
 * @access  Private (Super Admin)
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await organizationService.getOrganizationStats(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: stats
  });
});

/**
 * @route   GET /api/v1/organizations/:id/institutions
 * @desc    Get institutions by organization
 * @access  Private (Super Admin)
 */
const getInstitutions = asyncHandler(async (req, res) => {
  const institutions = await organizationService.getInstitutionsByOrganization(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    count: institutions.length,
    data: institutions
  });
});

module.exports = {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  toggleStatus,
  getStats,
  getInstitutions
};
