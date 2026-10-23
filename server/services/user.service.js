const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');

/**
 * User Service - Handles user-related business logic
 */
class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('-password')
      .populate('institution', 'name type')
      .populate('organization', 'name code');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const { name, email } = updateData;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        throw new ApiError(400, 'Email already in use');
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution: user.institution
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  /**
   * Get all users (with filters)
   */
  async getUsers(filters = {}, currentUser) {
    const query = {};

    // Institution filtering based on role
    if (currentUser.role === 'super_admin') {
      // Super admin can filter by institution if provided
      // BUT: If filtering by super_admin or org-level role, don't apply institution filter
      if (filters.institution && filters.role !== 'super_admin' && filters.role !== 'organization_admin' && filters.role !== 'finance_manager') {
        query.institution = filters.institution;
      }
    } else if (currentUser.role === 'organization_admin' || currentUser.role === 'finance_manager') {
      // User with organization scoping sees users belonging to campuses in their organization
      if (currentUser.organization) {
        const orgId = currentUser.organization._id || currentUser.organization;
        const Institution = require('../models/Institution');
        const orgInstitutions = await Institution.find({ organization: orgId }).select('_id');
        const instIds = orgInstitutions.map(i => i._id);

        if (filters.institution) {
          query.institution = filters.institution;
        } else {
          query.$or = [
            { institution: { $in: instIds } },
            { organization: orgId }
          ];
        }
      }
    } else if (currentUser.institution) {
      // Regular admin only sees users from their institution
      query.institution = currentUser.institution;
    }

    // Apply role filter
    if (filters.role) {
      query.role = filters.role;
      // If filtering by super_admin, organization_admin or finance_manager, ensure we don't filter by institution
      if (['super_admin', 'organization_admin', 'finance_manager'].includes(filters.role) && !filters.institution) {
        delete query.institution;
      }
    }

    // Apply additional filters
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('institution', 'name type')
      .populate('organization', 'name code')
      .sort({ createdAt: -1 });

    console.log('=== GET USERS SERVICE ===', {
      filters,
      currentUserRole: currentUser.role,
      queryObject: query,
      returnedCount: users.length
    });

    return users;
  }

  /**
   * Create user (by admin)
   */
  async createUser(userData, createdBy) {
    const { name, email, password, role, institution, organization, phone, address, dateOfBirth, gender } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Validate permissions
    if (createdBy.role === 'admin') {
      if (role === 'super_admin' || role === 'organization_admin') {
        throw new ApiError(403, 'You do not have permission to create this user role');
      }
      
      // Admins can only create users for their institution (unless creating org-level role if allowed)
      if (role !== 'finance_manager' && role !== 'organization_admin' && (!institution || institution.toString() !== createdBy.institution.toString())) {
        throw new ApiError(403, 'You can only create users for your institution');
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      institution,
      organization,
      phone,
      address,
      dateOfBirth,
      gender
    });

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type')
      .populate('organization', 'name code');

    return populatedUser;
  }

  /**
   * Update user (by admin)
   */
  async updateUser(userId, updateData, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      if (user.role !== 'finance_manager' && user.role !== 'organization_admin' && (!user.institution || user.institution.toString() !== currentUser.institution.toString())) {
        throw new ApiError(403, 'You can only update users from your institution');
      }
    }

    // Check if email is being changed
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId }
      });
      if (emailExists) {
        throw new ApiError(400, 'Email already in use');
      }
    }

    // Handle password update if provided
    if (updateData.password) {
      user.password = updateData.password;
      delete updateData.password; // Remove from updateData to avoid double assignment
    }

    // If changing to a role that doesn't use institution, unset it
    if (updateData.role === 'super_admin' || updateData.role === 'finance_manager' || updateData.role === 'organization_admin') {
      user.institution = undefined;
    }
    // If changing to a role that doesn't use organization, unset it
    if (updateData.role && updateData.role !== 'finance_manager' && updateData.role !== 'organization_admin') {
      user.organization = undefined;
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    return await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type')
      .populate('organization', 'name code');
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && user.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'You can only deactivate users from your institution');
    }

    user.isActive = false;
    await user.save();

    return { message: 'User deactivated successfully' };
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && user.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    user.isActive = !user.isActive;
    await user.save();

    return await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type');
  }

  /**
   * Permanently delete user
   */
  async deleteUser(userId, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent self-deletion
    const currentUserId = (currentUser.id || currentUser._id || '').toString();
    if (user._id.toString() === currentUserId) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    // Prevent deleting root developer
    if ((user.email || '').trim().toLowerCase() === 'harisnaseer3@gmail.com') {
      throw new ApiError(403, 'Root developer account cannot be deleted');
    }

    // Role-based restrictions
    if (currentUser.role !== 'super_admin') {
      if (user.role === 'super_admin') {
        throw new ApiError(403, 'Only a Super Admin can delete a Super Admin user');
      }

      if (currentUser.role === 'organization_admin') {
        if (user.role === 'organization_admin') {
          throw new ApiError(403, 'Cannot delete another Organization Admin');
        }
        if (user.institution && currentUser.organization) {
          const Institution = require('../models/Institution');
          const orgId = currentUser.organization._id || currentUser.organization;
          const inst = await Institution.findOne({ _id: user.institution, organization: orgId });
          if (!inst) {
            throw new ApiError(403, 'User does not belong to your organization');
          }
        }
      } else if (currentUser.institution) {
        if (!user.institution || user.institution.toString() !== currentUser.institution.toString()) {
          throw new ApiError(403, 'You can only delete users from your own campus');
        }
        if (['admin', 'organization_admin', 'super_admin'].includes(user.role)) {
          throw new ApiError(403, 'You do not have permission to delete administrative users');
        }
      }
    }

    await User.findByIdAndDelete(userId);
    return { message: 'User permanently deleted' };
  }
}

module.exports = new UserService();
