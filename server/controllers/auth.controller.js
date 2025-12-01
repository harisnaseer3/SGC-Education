const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Auth Controller - Handles HTTP requests for authentication
 */

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public (will be restricted to admins later)
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: result
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.json({
    success: true,
    data: result
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged-in user
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);

  res.json({
    success: true,
    data: user
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // In JWT, logout is handled on client-side by removing token
  // This endpoint is for future features like token blacklisting

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout
};
