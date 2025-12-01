const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const institutionRoutes = require('./institution.routes');
const departmentRoutes = require('./department.routes');

/**
 * API v1 Routes
 * Base path: /api/v1
 */

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes);
router.use('/departments', departmentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
