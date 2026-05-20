const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { USER_ROLES } = require('../../utils/constants');

/**
 * Dashboard Routes - API v1
 * Base path: /api/v1/dashboard
 */

// All routes require authentication
router.use(authenticate);

// Allow access for SUPER_ADMIN, ADMIN, and FINANCE_MANAGER
router.use(authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.FINANCE_MANAGER));

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get analytics data (trends, charts)
router.get('/analytics', dashboardController.getAnalytics);

module.exports = router;
