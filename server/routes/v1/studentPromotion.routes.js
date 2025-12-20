const express = require('express');
const router = express.Router();
const {
  processStudentOperation,
  getStudentPromotionHistory,
  getAllPromotions
} = require('../../controllers/studentPromotion.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// All routes require admin or super_admin role
router.use(authorize('admin', 'super_admin'));

router.post('/', processStudentOperation);
router.get('/', getAllPromotions);
router.get('/student/:studentId', getStudentPromotionHistory);

module.exports = router;

