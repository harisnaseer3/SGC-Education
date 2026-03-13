const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin, hasPermission } = require('../../middleware/rbac.middleware');
const { validatePasswordChange } = require('../../middleware/validation.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * User Routes - API v1
 * Base path: /api/v1/users
 */

// All routes require authentication
router.use(authenticate);

// Profile routes (accessible by all authenticated users)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', validatePasswordChange, userController.changePassword);

// Admin only routes - using granular permissions
router.get('/', hasPermission(PERMISSIONS.USERS.VIEW), userController.getUsers);
router.post('/', hasPermission(PERMISSIONS.USERS.CREATE), userController.createUser);
router.get('/:id', hasPermission(PERMISSIONS.USERS.VIEW), userController.getUserById);
router.put('/:id', hasPermission(PERMISSIONS.USERS.EDIT), userController.updateUser);
router.put('/:id/toggle-status', hasPermission(PERMISSIONS.USERS.EDIT), userController.toggleUserStatus);
router.put('/:id/deactivate', hasPermission(PERMISSIONS.USERS.EDIT), userController.deactivateUser);

module.exports = router;
