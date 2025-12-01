const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validateLogin, validateRegistration } = require('../../middleware/validation.middleware');

/**
 * Auth Routes - API v1
 * Base path: /api/v1/auth
 */

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
