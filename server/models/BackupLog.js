const mongoose = require('mongoose');

const backupLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['full', 'incremental'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  collectionsBackedUp: [{
    name: String,
    documentCount: Number
  }],
  totalDocuments: {
    type: Number,
    default: 0
  },
  error: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BackupLog', backupLogSchema);
