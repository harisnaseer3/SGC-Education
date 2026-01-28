const express = require('express');
const router = express.Router();
const institutionController = require('../../controllers/institution.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/uploads/institutions');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

/**
 * Institution Routes - API v1
 * Base path: /api/v1/institutions
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', institutionController.getInstitutions);
router.get('/:id', institutionController.getInstitutionById);
router.get('/:id/stats', institutionController.getStats);

// Super Admin only routes
router.post('/', isSuperAdmin, institutionController.createInstitution);
router.put('/:id', isSuperAdmin, institutionController.updateInstitution);
router.delete('/:id', isSuperAdmin, institutionController.deleteInstitution);
router.put('/:id/toggle-status', isSuperAdmin, institutionController.toggleStatus);

// Logo upload route
router.post('/:id/upload-logo', isSuperAdmin, upload.single('logo'), institutionController.uploadLogo);

module.exports = router;
