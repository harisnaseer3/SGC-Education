const express = require('express');
const router = express.Router();
const admissionController = require('../../controllers/admission.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Admission Routes - API v1
 * Base path: /api/v1/admissions
 */

// Public route for creating admission application (self-registration)
// Uncomment if you want to allow public admission applications
// router.post('/', admissionController.createAdmission);

// All other routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', admissionController.getAdmissions);
router.get('/stats/overview', admissionController.getAdmissionStats);
router.get('/:id', admissionController.getAdmissionById);

// Admin and staff routes (create, update)
router.post('/', admissionController.createAdmission);
router.put('/:id', admissionController.updateAdmission);

// Admin only routes (status changes, approval, rejection)
router.put('/:id/status', isAdmin, admissionController.updateAdmissionStatus);
router.post('/:id/approve-enroll', isAdmin, admissionController.approveAndEnroll);
router.put('/:id/reject', isAdmin, admissionController.rejectAdmission);
router.delete('/:id', isAdmin, admissionController.deleteAdmission);

module.exports = router;
