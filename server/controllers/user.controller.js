const userService = require('../services/user.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * User Controller - Handles HTTP requests for user management
 */

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);

  res.json({
    success: true,
    data: user
  });
});

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});

/**
 * @route   PUT /api/v1/users/change-password
 * @desc    Change user password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await userService.changePassword(req.user.id, currentPassword, newPassword);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (filtered by role/institution/department/search)
 * @access  Private (Admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, institution, department, isActive, search } = req.query;

  const users = await userService.getUsers(
    { role, institution, department, isActive, search },
    req.user
  );

  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Admin)
 */
const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);

  res.json({
    success: true,
    data: user
  });
});

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user (by admin)
 * @access  Private (Admin)
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

/**
 * @route   PUT /api/v1/users/:id/toggle-status
 * @desc    Toggle user active status
 * @access  Private (Admin)
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.toggleUserStatus(req.params.id, req.user);

  res.json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: user
  });
});

/**
 * @route   PUT /api/v1/users/:id/deactivate
 * @desc    Deactivate user (deprecated - use toggle-status)
 * @access  Private (Admin)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  await userService.deactivateUser(req.params.id, req.user);

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  createUser,
  getUserById,
  updateUser,
  toggleUserStatus,
  deactivateUser
};
