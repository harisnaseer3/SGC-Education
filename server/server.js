const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const createSuperAdmin = require('./utils/createSuperAdmin');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  // Create super admin if doesn't exist
  createSuperAdmin();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

const PORT = process.env.PORT || 5000;

// Routes
app.use('/api', require('./routes'));

// Legacy routes (will be deprecated)
app.use('/api/auth', require('./routes/v1/auth.routes'));
app.use('/api/user', require('./routes/v1/user.routes'));

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API v1: http://localhost:${PORT}/api/v1`);
});

module.exports = app;
