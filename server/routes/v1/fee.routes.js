const express = require('express');
const router = express.Router();
const feeController = require('../../controllers/fee.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin, hasPermission, hasAnyPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const reconDir = 'public/uploads/reconciliations';
if (!fs.existsSync(reconDir)) {
  fs.mkdirSync(reconDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reconDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recon-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Fee Routes - API v1
 * Base path: /api/v1/fees
 */

// All routes require authentication
router.use(authenticate);

// Fee structure routes
router.get('/structures/matrix', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getFeeStructureMatrix);
router.get('/structures/class/:classId', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getFeeStructureByClass);
router.post('/structures/bulk-save', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.bulkSaveFeeStructure);
router.post('/bulk-update', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.bulkUpdateStudentFees);

// Student fee assignment routes
router.get('/students/without-fee-structure', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getStudentsWithoutFeeStructure);
router.post('/assign-structure', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.assignFeeStructure);
router.put('/update-structure', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.updateFeeStructure);
router.get('/student-fees', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.VIEW_VOUCHER, PERMISSIONS.FEES.PRINT_VOUCHER), feeController.getStudentFees);
router.post('/generate-vouchers', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.GENERATE_VOUCHER), feeController.generateVouchers);

// Payment routes
router.post('/record-payment', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.SUBMIT_VOUCHER), feeController.recordPayment);
router.get('/outstanding-balances', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getOutstandingBalances);
router.get('/payments', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getPayments);
router.delete('/payments/bulk', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.bulkReversePayments);
router.delete('/payments/:paymentId', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.reversePayment);

// Voucher routes
router.delete('/vouchers', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.deleteVoucher);

// Suspense management routes
router.get('/suspense', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getSuspenseEntries);
router.post('/suspense', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.recordSuspenseEntry);
router.post('/suspense/reconcile', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.reconcileSuspenseEntry);
router.delete('/suspense/:id', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.deleteSuspenseEntry);

// Monthly Reconciliation routes
router.get('/monthly-reconciliations', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getMonthlyReconciliations);
router.post('/monthly-reconciliations', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.saveMonthlyReconciliation);
router.post('/monthly-reconciliations/:monthKey/attachment', hasAnyPermission(PERMISSIONS.FEES.MANAGE), upload.single('attachment'), feeController.uploadReconciliationAttachment);
router.delete('/monthly-reconciliations/:monthKey/attachment', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.removeReconciliationAttachment);

module.exports = router;
