const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a role name'],
    unique: true,
    trim: true,
    lowercase: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true
  },
  isSystemRole: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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

roleSchema.pre('save', async function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Role', roleSchema);
