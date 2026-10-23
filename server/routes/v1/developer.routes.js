const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { authenticate } = require('../../middleware/auth.middleware');
const { isDeveloper } = require('../../middleware/rbac.middleware');
const { createActivityLog } = require('../../middleware/activityLog.middleware');
const { ROLE_PERMISSIONS } = require('../../utils/constants');

// All developer routes strictly require authentication and developer credentials
router.use(authenticate);
router.use(isDeveloper);

/**
 * @route   POST /api/v1/developer/reset-password/:userId
 * @desc    Directly reset a user's password without knowing old password
 * @access  Developer Only
 */
router.post('/reset-password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let { newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If no password provided, generate a readable 8-character temporary password
    if (!newPassword || newPassword.trim().length < 6) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      newPassword = `Sgc@${randomSuffix}`;
    }

    user.password = newPassword;
    await user.save();

    // Log the developer action
    createActivityLog(
      req.user._id,
      'update',
      'user',
      `Developer (${req.user.name}) reset password for user: ${user.name} (${user.email})`,
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      }
    );

    res.json({
      success: true,
      message: `Password successfully reset for ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      temporaryPassword: newPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset user password',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/developer/impersonate/:userId
 * @desc    Log in as any user without password
 * @access  Developer Only
 */
router.post('/impersonate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findById(userId)
      .populate('institution', '_id name code type')
      .populate('organization', '_id name code');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to impersonate not found'
      });
    }

    // Generate JWT token for target user
    const token = jwt.sign(
      { id: targetUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Fetch permissions for the role
    const roleDoc = await Role.findOne({ name: targetUser.role, isActive: true });
    const permissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[targetUser.role] || []);

    // Log the impersonation action for security audit
    createActivityLog(
      req.user._id,
      'login',
      'user',
      `Developer (${req.user.name}) impersonated user: ${targetUser.name} (${targetUser.email})`,
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      }
    );

    res.json({
      success: true,
      message: `Now impersonating ${targetUser.name}`,
      token,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        institution: targetUser.institution,
        organization: targetUser.organization,
        isDeveloper: Boolean(targetUser.isDeveloper),
        permissions
      },
      impersonatedBy: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Impersonation failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/developer/user-info/:userId
 * @desc    Get detailed credentials and recovery metadata for a user
 * @access  Developer Only
 */
router.get('/user-info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('institution', 'name code type address phone')
      .populate('organization', 'name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user information',
      error: error.message
    });
  }
});

module.exports = router;
