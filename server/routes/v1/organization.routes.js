const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const organizationController = require('../../controllers/organization.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

// Middleware to validate ObjectId format
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  next();
};

/**
 * Organization Routes - API v1
 * Base path: /api/v1/organizations
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', organizationController.getOrganizations);
router.get('/:id', validateObjectId, organizationController.getOrganizationById);
router.get('/:id/stats', validateObjectId, organizationController.getStats);
router.get('/:id/institutions', validateObjectId, organizationController.getInstitutions);

// Admin only routes (create, update, delete)
router.post('/', isAdmin, organizationController.createOrganization);
router.put('/:id', validateObjectId, isAdmin, organizationController.updateOrganization);
router.delete('/:id', validateObjectId, isAdmin, organizationController.deleteOrganization);
router.put('/:id/toggle-status', validateObjectId, isAdmin, organizationController.toggleStatus);

module.exports = router;

