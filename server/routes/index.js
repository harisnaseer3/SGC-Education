const express = require('express');
const router = express.Router();

// Import API versions
const v1Routes = require('./v1');

/**
 * Main Router
 * Handles all API routes
 */

// API v1
router.use('/v1', v1Routes);

// Default route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to SGC Education API',
    version: '1.0.0',
    endpoints: {
      v1: '/api/v1'
    }
  });
});

module.exports = router;
