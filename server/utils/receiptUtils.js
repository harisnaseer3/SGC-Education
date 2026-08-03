const ReceiptCounter = require('../models/ReceiptCounter');
const FeePayment = require('../models/FeePayment');

/**
 * Generate a unique receipt number atomically using ReceiptCounter
 * This prevents race conditions and ensures global uniqueness across institutions.
 * 
 * @param {Object} options - Options for receipt generation
 * @param {Object} [options.institution] - Institution ObjectId (optional)
 * @param {Number} [options.year] - Year (defaults to current year)
 * @param {String} [options.type] - Receipt type (defaults to 'RCP')
 * @returns {Promise<String>} Unique receipt number in format: RCP-YYYY-XXXXXX
 */
async function generateReceiptNumber({ institution, year, type = 'RCP' } = {}) {
  const currentYear = year || new Date().getFullYear();
  const receiptType = type.toUpperCase();

  // Find existing global counter for this year/type
  let counter = await ReceiptCounter.findOne({
    year: currentYear,
    type: receiptType
  });

  if (!counter) {
    // Sync counter with the maximum receipt sequence in existing FeePayment records
    const pattern = new RegExp(`^${receiptType}-${currentYear}-(\\d+)`, 'i');
    const latestPayment = await FeePayment.findOne({
      receiptNumber: pattern
    }).sort({ receiptNumber: -1 }).select('receiptNumber').lean();

    let maxSeq = 0;
    if (latestPayment && latestPayment.receiptNumber) {
      const match = latestPayment.receiptNumber.match(pattern);
      if (match && match[1]) {
        maxSeq = parseInt(match[1], 10) || 0;
      }
    }

    try {
      counter = await ReceiptCounter.findOneAndUpdate(
        {
          year: currentYear,
          type: receiptType
        },
        {
          $setOnInsert: {
            year: currentYear,
            type: receiptType,
            seq: maxSeq
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (e) {
      // Fallback if created concurrently
      counter = await ReceiptCounter.findOne({ year: currentYear, type: receiptType });
    }
  }

  // Atomically increment seq for thread safety
  const updatedCounter = await ReceiptCounter.findOneAndUpdate(
    {
      year: currentYear,
      type: receiptType
    },
    {
      $inc: { seq: 1 }
    },
    {
      new: true,
      upsert: true
    }
  );

  const seq = updatedCounter && updatedCounter.seq !== undefined ? updatedCounter.seq : 1;

  // Generate receipt number: RCP-YYYY-XXXXXX
  const receiptNumber = `${receiptType}-${currentYear}-${String(seq).padStart(6, '0')}`;

  return receiptNumber;
}

module.exports = {
  generateReceiptNumber
};
