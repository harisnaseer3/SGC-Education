const studentPromotionService = require('../services/studentPromotion.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @desc    Process student promotion/transfer/passout
 * @route   POST /api/v1/student-promotions
 * @access  Private (Admin, Super Admin)
 */
exports.processStudentOperation = asyncHandler(async (req, res) => {
  const result = await studentPromotionService.processStudentOperation(
    req.body,
    req.user
  );

  res.status(200).json({
    success: true,
    message: `Successfully processed ${result.processed} out of ${result.total} student(s)`,
    data: result
  });
});

/**
 * @desc    Get promotion history for a student
 * @route   GET /api/v1/student-promotions/student/:studentId
 * @access  Private (Admin, Super Admin)
 */
exports.getStudentPromotionHistory = asyncHandler(async (req, res) => {
  const promotions = await studentPromotionService.getStudentPromotionHistory(
    req.params.studentId,
    req.user
  );

  res.status(200).json({
    success: true,
    count: promotions.length,
    data: promotions
  });
});

/**
 * @desc    Get all promotions/transfers/passouts
 * @route   GET /api/v1/student-promotions
 * @access  Private (Admin, Super Admin)
 */
exports.getAllPromotions = asyncHandler(async (req, res) => {
  const result = await studentPromotionService.getAllPromotions(
    req.query,
    req.user
  );

  res.status(200).json({
    success: true,
    ...result
  });
});

