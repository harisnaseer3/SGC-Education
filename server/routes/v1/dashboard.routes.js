const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission, hasAnyPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Dashboard Routes - API v1
 * Base path: /api/v1/dashboard
 */

// All routes require authentication
router.use(authenticate);

// Get dashboard statistics - requires dashboard:stats
router.get('/stats', hasPermission(PERMISSIONS.DASHBOARD.STATS), dashboardController.getDashboardStats);

// Get analytics data (trends, charts) - requires dashboard:stats
router.get('/analytics', hasPermission(PERMISSIONS.DASHBOARD.STATS), dashboardController.getAnalytics);

// Get consolidated banks statement report - requires dashboard:stats or fee:report
router.get('/banks-statement-report', hasAnyPermission([PERMISSIONS.DASHBOARD.STATS, PERMISSIONS.FEES.REPORT]), dashboardController.getBanksStatementReport);

module.exports = router;
