const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { ApiError } = require('../middleware/error.middleware');
const { ROLE_PERMISSIONS } = require('../utils/constants');

/**
 * Auth Service - Handles authentication business logic
 */
class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const { name, email, password, role, institution } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      institution
    });

    // Generate token
    const token = this.generateToken(user._id);

    // Fetch permissions for the role
    const roleDoc = await Role.findOne({ name: role || 'student', isActive: true });
    const permissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[role || 'student'] || []);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        permissions
      },
      token
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(401, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user._id);

    // Fetch permissions for the role
    const roleDoc = await Role.findOne({ name: user.role, isActive: true });
    const permissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[user.role] || []);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        permissions
      },
      token
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId)
      .select('-password')
      .populate('institution', 'name type');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Fetch permissions
    const roleDoc = await Role.findOne({ name: user.role, isActive: true });
    const permissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[user.role] || []);

    const userObj = user.toObject();
    userObj.permissions = permissions;

    return userObj;
  }
}

module.exports = new AuthService();
