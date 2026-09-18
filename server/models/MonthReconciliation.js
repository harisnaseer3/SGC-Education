const mongoose = require('mongoose');

const monthReconciliationSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  monthKey: {
    type: String,
    required: [true, 'Please provide month key'],
    trim: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    default: null
  },
  reconcileAmount: {
    type: Number,
    default: 0
  },
  attachment: {
    type: String,
    trim: true,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

monthReconciliationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Update index to include bankAccount so that multiple banks can be reconciled in the same month
// If bankAccount is null (all banks), it will still be unique per institution/month
monthReconciliationSchema.index({ institution: 1, monthKey: 1, bankAccount: 1 }, { unique: true });

module.exports = mongoose.model('MonthReconciliation', monthReconciliationSchema);
