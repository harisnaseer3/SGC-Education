const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide organization name'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Please provide organization code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['school', 'college', 'mixed'],
    default: 'mixed'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
organizationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes for better query performance
organizationSchema.index({ code: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Organization', organizationSchema);
