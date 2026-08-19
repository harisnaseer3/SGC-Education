const express = require('express');
const router = express.Router();
const activityLogController = require('../../controllers/activityLog.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

/**
 * Activity Log Routes - API v1
 * Base path: /api/v1/activity-logs
 */

// All routes require authentication and Super Admin role
router.use(authenticate);
router.use(isSuperAdmin);

// Get activity logs with pagination and filters
router.get('/', activityLogController.getActivityLogs);

// Get recent activity logs
router.get('/recent', activityLogController.getRecentLogs);

// Get activity statistics
router.get('/stats', activityLogController.getActivityStats);

module.exports = router;
