const mongoose = require('mongoose');

const sequenceCounterSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['admission', 'enrollment'],
    trim: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

sequenceCounterSchema.index({ institution: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('SequenceCounter', sequenceCounterSchema);
