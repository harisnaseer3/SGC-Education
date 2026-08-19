const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { createActivityLog } = require('../middleware/activityLog.middleware');

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

  if (result.user) {
    createActivityLog(result.user.id, 'create', 'user', `User registered: ${result.user.name}`, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }

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

  if (result.user) {
    createActivityLog(result.user.id, 'login', 'user', `User logged in: ${result.user.name} (${result.user.email})`, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }

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
  if (req.user) {
    createActivityLog(req.user.id, 'logout', 'user', `User logged out: ${req.user.name || req.user.email}`, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }

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
