const express = require('express');
const router = express.Router();
const erpController = require('../../controllers/erpIntegration.controller');
const erpAuthMiddleware = require('../../middleware/erpAuth.middleware');

/**
 * ERP Integration Routes - API v1
 * Base path: /api/v1/erp
 * All endpoints require valid ERP API Key header (x-api-key or Authorization: Bearer <API_KEY>)
 */

// Protect all ERP routes with API Key middleware
router.use(erpAuthMiddleware);

// Get all-in-one unified ERP summary (Overview, Financials, Campuses, & Daily Trends)
router.get('/full-summary', erpController.getFullSummary);

// Get total fee collections and summary metrics
router.get('/collections', erpController.getCollections);

// Get collection breakdown per campus / institution
router.get('/campus-breakdown', erpController.getCampusBreakdown);

// Get daily collection history for ERP charts
router.get('/daily-collection', erpController.getDailyCollection);

module.exports = router;
