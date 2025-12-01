const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/department.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Department Routes - API v1
 * Base path: /api/v1/departments
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', departmentController.getDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.get('/:id/stats', departmentController.getStats);

// Admin only routes
router.post('/', isAdmin, departmentController.createDepartment);
router.put('/:id', isAdmin, departmentController.updateDepartment);
router.delete('/:id', isAdmin, departmentController.deleteDepartment);
router.put('/:id/toggle-status', isAdmin, departmentController.toggleStatus);

module.exports = router;
