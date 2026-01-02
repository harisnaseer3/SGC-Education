const express = require('express');
const router = express.Router();
const institutionController = require('../../controllers/institution.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

/**
 * Institution Routes - API v1
 * Base path: /api/v1/institutions
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', institutionController.getInstitutions);
router.get('/:id', institutionController.getInstitutionById);
router.get('/:id/stats', institutionController.getStats);
// Super Admin only routes
router.post('/', isSuperAdmin, institutionController.createInstitution);
router.put('/:id', isSuperAdmin, institutionController.updateInstitution);
router.delete('/:id', isSuperAdmin, institutionController.deleteInstitution);
router.put('/:id/toggle-status', isSuperAdmin, institutionController.toggleStatus);

module.exports = router;
