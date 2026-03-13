const express = require('express');
const router = express.Router();
const Role = require('../../models/Role');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS, HTTP_STATUS } = require('../../utils/constants');

// All role routes require authentication and super_admin role
router.use(authenticate);
router.use(authorize('super_admin'));

/**
 * @route GET /v1/roles
 * @desc Get all roles
 */
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * @route POST /v1/roles
 * @desc Create a new role
 */
router.post('/', async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    
    // Check if role exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Role already exists'
      });
    }

    const role = await Role.create({
      name,
      permissions,
      description,
      isSystemRole: false
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: role
    });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * @route PUT /v1/roles/:id
 * @desc Update a role
 */
router.put('/:id', async (req, res) => {
  try {
    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Don't allow renaming system roles via standard API if needed, 
    // but permissions should be editable.
    const { permissions, description } = req.body;
    
    role.permissions = permissions || role.permissions;
    role.description = description || role.description;
    
    await role.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: role
    });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * @route DELETE /v1/roles/:id
 * @desc Delete a role
 */
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Role not found'
      });
    }

    if (role.isSystemRole) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    await role.remove();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
