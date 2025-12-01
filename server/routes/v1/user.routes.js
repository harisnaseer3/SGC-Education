const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');
const { validatePasswordChange } = require('../../middleware/validation.middleware');

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

// Admin only routes
router.get('/', isAdmin, userController.getUsers);
router.post('/', isAdmin, userController.createUser);
router.get('/:id', isAdmin, userController.getUserById);
router.put('/:id', isAdmin, userController.updateUser);
router.put('/:id/toggle-status', isAdmin, userController.toggleUserStatus);
router.put('/:id/deactivate', isAdmin, userController.deactivateUser);

module.exports = router;
