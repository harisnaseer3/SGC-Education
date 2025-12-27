const Organization = require('../models/Organization');
const Institution = require('../models/Institution');
const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Organization Service - Handles organization-related business logic
 */
class OrganizationService {
  /**
   * Get all organizations
   */
  async getAllOrganizations(filters = {}, currentUser) {
    // Super admin can see all organizations
    // Other users can only see organizations they belong to (if organization_admin role exists)
    const query = {};

    if (currentUser.role !== 'super_admin') {
      // If user has organization field and is organization_admin, filter by it
      if (currentUser.organization && currentUser.role === 'organization_admin') {
        query._id = currentUser.organization;
      } else {
        // Regular users don't see organizations directly
        return [];
      }
    }

    // Apply filters
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const organizations = await Organization.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return organizations;
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId, currentUser) {
    const organization = await Organization.findById(organizationId)
      .populate('createdBy', 'name email');

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      if (currentUser.role === 'organization_admin' && 
          organization._id.toString() !== currentUser.organization?.toString()) {
        throw new ApiError(403, 'Access denied to this organization');
      } else if (currentUser.role !== 'organization_admin') {
        throw new ApiError(403, 'Access denied');
      }
    }

    return organization;
  }

  /**
   * Create new organization
   */
  async createOrganization(organizationData, createdBy) {
    // Only super admin can create organizations
    if (createdBy.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can create organizations');
    }

    // Check if organization code already exists
    const existingCode = await Organization.findOne({ code: organizationData.code.toUpperCase() });
    if (existingCode) {
      throw new ApiError(400, 'Organization code already exists');
    }

    // Check if organization name already exists
    const existingName = await Organization.findOne({ name: organizationData.name });
    if (existingName) {
      throw new ApiError(400, 'Organization name already exists');
    }

    // Create organization
    const organization = await Organization.create({
      ...organizationData,
      code: organizationData.code.toUpperCase(),
      createdBy: createdBy.id
    });

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId, updateData, currentUser) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can update organizations');
    }

    // Check if code is being changed and already exists
    if (updateData.code && updateData.code.toUpperCase() !== organization.code) {
      const existingCode = await Organization.findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: organizationId }
      });
      if (existingCode) {
        throw new ApiError(400, 'Organization code already exists');
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Check if name is being changed and already exists
    if (updateData.name && updateData.name !== organization.name) {
      const existingName = await Organization.findOne({
        name: updateData.name,
        _id: { $ne: organizationId }
      });
      if (existingName) {
        throw new ApiError(400, 'Organization name already exists');
      }
    }

    // Update organization
    Object.assign(organization, updateData);
    await organization.save();

    return organization;
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, currentUser) {
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can delete organizations');
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    // Check if organization has institutions
    const institutionsCount = await Institution.countDocuments({ organization: organizationId });
    if (institutionsCount > 0) {
      throw new ApiError(400, `Cannot delete organization. It has ${institutionsCount} associated institutions. Please deactivate instead.`);
    }

    // Soft delete - just deactivate
    organization.isActive = false;
    await organization.save();

    return { message: 'Organization deactivated successfully' };
  }

  /**
   * Toggle organization status
   */
  async toggleOrganizationStatus(organizationId, currentUser) {
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can change organization status');
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    organization.isActive = !organization.isActive;
    await organization.save();

    return organization;
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId, currentUser) {
    // Check access
    if (currentUser.role !== 'super_admin' && 
        organizationId !== currentUser.organization?.toString()) {
      throw new ApiError(403, 'Access denied to this organization');
    }

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    // Get real-time counts
    const [institutionsCount, studentsCount, teachersCount] = await Promise.all([
      Institution.countDocuments({ organization: organizationId, isActive: true }),
      User.countDocuments({ 
        institution: { $in: await Institution.find({ organization: organizationId }).distinct('_id') },
        role: 'student', 
        isActive: true 
      }),
      User.countDocuments({ 
        institution: { $in: await Institution.find({ organization: organizationId }).distinct('_id') },
        role: 'teacher', 
        isActive: true 
      })
    ]);

    // Update stats
    organization.stats.totalInstitutions = institutionsCount;
    organization.stats.totalStudents = studentsCount;
    organization.stats.totalTeachers = teachersCount;
    await organization.save();

    return organization.stats;
  }

  /**
   * Get institutions by organization
   */
  async getInstitutionsByOrganization(organizationId, currentUser) {
    // Check access
    if (currentUser.role !== 'super_admin' && 
        organizationId !== currentUser.organization?.toString()) {
      throw new ApiError(403, 'Access denied to this organization');
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    const institutions = await Institution.find({ organization: organizationId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return institutions;
  }
}

module.exports = new OrganizationService();

