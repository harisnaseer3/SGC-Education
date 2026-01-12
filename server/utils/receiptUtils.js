const ReceiptCounter = require('../models/ReceiptCounter');

/**
 * Generate a unique receipt number atomically using ReceiptCounter
 * This prevents race conditions when multiple payments are created simultaneously
 * 
 * @param {Object} options - Options for receipt generation
 * @param {Object} options.institution - Institution ObjectId
 * @param {Number} options.year - Year (defaults to current year)
 * @param {String} options.type - Receipt type (defaults to 'RCP')
 * @returns {Promise<String>} Unique receipt number in format: RCP-YYYY-XXXXXX
 */
async function generateReceiptNumber({ institution, year, type = 'RCP' }) {
  if (!institution) {
    throw new Error('Institution is required for receipt number generation');
  }

  const currentYear = year || new Date().getFullYear();
  const receiptType = type.toUpperCase();

  // Use findOneAndUpdate with $inc for atomic increment
  // This ensures thread-safe counter increment even with concurrent requests
  // When document doesn't exist, $inc will create it with seq: 1 (first receipt)
  const counter = await ReceiptCounter.findOneAndUpdate(
    {
      institution: institution,
      year: currentYear,
      type: receiptType
    },
    {
      $inc: { seq: 1 },
      $setOnInsert: {
        institution: institution,
        year: currentYear,
        type: receiptType
      }
    },
    {
      upsert: true, // Create if doesn't exist
      new: true, // Return updated document
      setDefaultsOnInsert: true // Set defaults on insert
    }
  );

  // Ensure seq is a valid number
  const seq = counter && counter.seq !== undefined ? counter.seq : 0;

  // Generate receipt number: RCP-YYYY-XXXXXX
  const receiptNumber = `${receiptType}-${currentYear}-${String(seq).padStart(6, '0')}`;

  return receiptNumber;
}

module.exports = {
  generateReceiptNumber
};
