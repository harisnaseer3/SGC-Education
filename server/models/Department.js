const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide department name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide department code'],
    uppercase: true,
    trim: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  description: {
    type: String,
    trim: true
  },
  head: {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  building: {
    type: String,
    trim: true
  },
  floor: {
    type: String,
    trim: true
  },
  roomNumber: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  stats: {
    totalTeachers: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    totalClasses: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
departmentSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Compound index for unique department code per institution
departmentSchema.index({ code: 1, institution: 1 }, { unique: true });

// Indexes for better query performance
departmentSchema.index({ institution: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ createdAt: -1 });

// Virtual for full location
departmentSchema.virtual('location').get(function() {
  const parts = [];
  if (this.building) parts.push(this.building);
  if (this.floor) parts.push(`Floor ${this.floor}`);
  if (this.roomNumber) parts.push(`Room ${this.roomNumber}`);
  return parts.join(', ') || 'Not specified';
});

module.exports = mongoose.model('Department', departmentSchema);
