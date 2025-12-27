const FeeHead = require('../models/FeeHead');
const { ApiError } = require('../middleware/error.middleware');

/**
 * FeeHead Service - Handles fee head-related business logic
 */
class FeeHeadService {
  /**
   * Get all fee heads (filtered by user role and institution)
   */
  async getAllFeeHeads(filters = {}, currentUser) {
    const mongoose = require('mongoose');
    
    // Show both active and inactive fee heads, but prioritize active ones
    let query = {};
    
    // If showInactive filter is not explicitly set, default to showing all
    // But we can add a filter option later if needed
    if (filters.showInactive === false) {
      query.isActive = true;
    }

    // Build institution filter - show fee heads with matching institution OR null (for backward compatibility)
    let institutionFilter = null;
    if (currentUser.role !== 'super_admin') {
      // For admin users, use their institution
      if (currentUser.institution) {
        const institutionId = typeof currentUser.institution === 'object' 
          ? currentUser.institution._id || currentUser.institution
          : currentUser.institution;
        institutionFilter = institutionId;
      } else {
        // If admin has no institution, return empty array
        return [];
      }
    } else if (filters.institution) {
      // For super admin, use filter if provided
      institutionFilter = filters.institution;
    }

    // Apply institution filter (including null for backward compatibility)
    if (institutionFilter) {
      query.$or = [
        { institution: institutionFilter },
        { institution: null }
      ];
    }

    // Apply search filter
    if (filters.search) {
      const searchConditions = [
        { name: { $regex: filters.search, $options: 'i' } },
        { glAccount: { $regex: filters.search, $options: 'i' } },
        { frequencyType: { $regex: filters.search, $options: 'i' } }
      ];

      // If we have institution filter, combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // First, update fee heads with null institution to the current institution
    // This ensures fee heads belong to the institution they're being viewed from
    let targetInstitutionId = null;
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        targetInstitutionId = typeof currentUser.institution === 'object' 
          ? currentUser.institution._id 
          : currentUser.institution;
      }
    } else if (filters.institution) {
      targetInstitutionId = filters.institution;
    }

    if (targetInstitutionId) {
      // Update fee heads with null institution to the target institution
      await FeeHead.updateMany(
        { institution: null, isActive: { $ne: false } },
        { $set: { institution: targetInstitutionId } }
      );
      
      // Rebuild query from scratch to avoid Mongoose validation issues
      const finalQuery = {};
      if (query.isActive !== undefined) {
        finalQuery.isActive = query.isActive;
      }
      finalQuery.institution = targetInstitutionId;
      
      // If there's a search filter, add it back
      if (filters.search) {
        finalQuery.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { glAccount: { $regex: filters.search, $options: 'i' } },
          { frequencyType: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      // Use the final query
      query = finalQuery;
    }

    const feeHeads = await FeeHead.find(query)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name')
      .sort({ isActive: -1, priority: 1 }); // Active first, then by priority

    return feeHeads;
  }

  /**
   * Get fee head by ID
   */
  async getFeeHeadById(feeHeadId, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name');

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeHeadInstitutionId = typeof feeHead.institution === 'object'
        ? feeHead.institution._id
        : feeHead.institution;

      if (feeHeadInstitutionId && feeHeadInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    return feeHead;
  }

  /**
   * Create new fee head
   */
  async createFeeHead(feeHeadData, currentUser) {
    feeHeadData.createdBy = currentUser._id;

    // Get the final institution ID - prioritize from feeHeadData, then from user
    let institutionId = feeHeadData.institution;
    
    // If not provided in feeHeadData, get from user
    if (!institutionId && currentUser.institution) {
      institutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
    }

    // For super admin, institution must be provided in feeHeadData
    // For admin, use their institution
    if (currentUser.role !== 'super_admin') {
      // Admin users must have an institution
      if (!institutionId) {
        throw new ApiError(400, 'Institution is required for admin users');
      }
    } else {
      // Super admin must provide institution in feeHeadData
      if (!institutionId) {
        throw new ApiError(400, 'Institution is required');
      }
    }

    // Ensure institution is set in feeHeadData
    feeHeadData.institution = institutionId;

    // Check if priority is already used for this institution (including inactive ones for compound index)
    if (feeHeadData.priority) {
      const existingFeeHead = await FeeHead.findOne({
        institution: institutionId,
        priority: feeHeadData.priority
        // Don't filter by isActive here - check all records for the compound unique index
      });

      if (existingFeeHead) {
        if (existingFeeHead.isActive) {
          throw new ApiError(400, `Priority ${feeHeadData.priority} is already used for this institution`);
        } else {
          // If inactive, we can reactivate it or use a different priority
          throw new ApiError(400, `Priority ${feeHeadData.priority} is already used for this institution (inactive record exists). Please use a different priority or reactivate the existing fee head.`);
        }
      }
    }

    // Check if GL Account will be unique (if provided or will be auto-generated)
    // The GL Account is auto-generated based on priority, so we need to check if it will conflict
    if (!feeHeadData.glAccount && feeHeadData.priority) {
      const priorityNum = feeHeadData.priority - 1;
      const generatedGlAccount = `401090${priorityNum}-101090${priorityNum}`;
      
      const existingGlAccount = await FeeHead.findOne({
        glAccount: generatedGlAccount,
        isActive: true
      });

      if (existingGlAccount) {
        // If GL account exists but for different institution, we can still proceed
        // But if it's for the same institution, it's a problem
        if (existingGlAccount.institution && existingGlAccount.institution.toString() === institutionId.toString()) {
          throw new ApiError(400, `GL Account ${generatedGlAccount} already exists for this institution`);
        }
      }
    } else if (feeHeadData.glAccount) {
      const existingGlAccount = await FeeHead.findOne({
        glAccount: feeHeadData.glAccount,
        isActive: true
      });

      if (existingGlAccount) {
        throw new ApiError(400, `GL Account ${feeHeadData.glAccount} already exists`);
      }
    }

    try {
      const feeHead = await FeeHead.create(feeHeadData);
      return await FeeHead.findById(feeHead._id)
        .populate('institution', 'name type code')
        .populate('createdBy', 'name');
    } catch (error) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'priority') {
          throw new ApiError(400, `Priority ${feeHeadData.priority} is already used for this institution`);
        } else if (field === 'glAccount') {
          throw new ApiError(400, `GL Account already exists`);
        } else {
          throw new ApiError(400, `Duplicate key error: ${field} already exists`);
        }
      }
      throw error;
    }
  }

  /**
   * Update fee head
   */
  async updateFeeHead(feeHeadId, feeHeadData, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeHeadInstitutionId = typeof feeHead.institution === 'object'
        ? feeHead.institution._id
        : feeHead.institution;

      if (feeHeadInstitutionId && feeHeadInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // If fee head has null institution, set it from feeHeadData or current user
    if (!feeHead.institution) {
      if (feeHeadData.institution) {
        feeHeadData.institution = feeHeadData.institution;
      } else if (currentUser.role !== 'super_admin' && currentUser.institution) {
        feeHeadData.institution = typeof currentUser.institution === 'object'
          ? currentUser.institution._id
          : currentUser.institution;
      }
    }

    // Get the final institution ID for validation
    const institutionId = feeHeadData.institution || feeHead.institution;
    
    // Check if priority is already used by another fee head
    if (institutionId && feeHeadData.priority && feeHeadData.priority !== feeHead.priority) {
      const existingFeeHead = await FeeHead.findOne({
        _id: { $ne: feeHeadId },
        institution: institutionId,
        priority: feeHeadData.priority,
        isActive: true
      });

      if (existingFeeHead) {
        throw new ApiError(400, `Priority ${feeHeadData.priority} is already used for this institution`);
      }
    }

    Object.assign(feeHead, feeHeadData);
    await feeHead.save();

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name');
  }

  /**
   * Delete fee head (soft delete)
   */
  async deleteFeeHead(feeHeadId, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeHeadInstitutionId = typeof feeHead.institution === 'object'
        ? feeHead.institution._id
        : feeHead.institution;

      if (feeHeadInstitutionId && feeHeadInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    feeHead.isActive = false;
    await feeHead.save();

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name');
  }

  /**
   * Get available priorities
   * Returns a list of priorities (1-10) with availability status
   */
  async getAvailablePriorities(currentUser) {
    const institutionId = currentUser.institution
      ? (typeof currentUser.institution === 'object' ? currentUser.institution._id : currentUser.institution)
      : null;

    // Get all used priorities for this institution
    const query = { isActive: true };
    if (institutionId) {
      query.institution = institutionId;
    }

    const existingFeeHeads = await FeeHead.find(query).select('priority');
    const usedPriorities = new Set(existingFeeHeads.map(fh => fh.priority));

    // Generate list of priorities 1-10
    const priorities = [];
    for (let i = 1; i <= 10; i++) {
      priorities.push({
        value: i,
        label: `Priority ${i}`,
        available: !usedPriorities.has(i)
      });
    }

    return priorities;
  }
}

module.exports = new FeeHeadService();
