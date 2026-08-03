const ReceiptCounter = require('../models/ReceiptCounter');
const FeePayment = require('../models/FeePayment');

/**
 * Generate a unique receipt number atomically using ReceiptCounter
 * This prevents race conditions and guarantees global uniqueness across institutions.
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

  // Atomically increment global sequence counter
  const counter = await ReceiptCounter.findOneAndUpdate(
    {
      year: currentYear,
      type: receiptType
    },
    {
      $inc: { seq: 1 }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  let seq = counter && counter.seq !== undefined ? counter.seq : 1;
  let receiptNumber = `${receiptType}-${currentYear}-${String(seq).padStart(6, '0')}`;

  // Check if this receipt number already exists in FeePayment collection
  const exists = await FeePayment.exists({ receiptNumber });

  if (exists) {
    // Perform numeric max search across all FeePayments for this year
    const pattern = new RegExp(`^${receiptType}-${currentYear}-`, 'i');
    const allPayments = await FeePayment.find(
      { receiptNumber: pattern },
      { receiptNumber: 1 }
    ).lean();

    let maxSeq = seq;
    for (const p of allPayments) {
      if (p.receiptNumber) {
        const parts = p.receiptNumber.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;

    // Update ReceiptCounter to nextSeq so future calls start from here
    await ReceiptCounter.findOneAndUpdate(
      { year: currentYear, type: receiptType },
      { $set: { seq: nextSeq } },
      { upsert: true }
    );

    receiptNumber = `${receiptType}-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
  }

  return receiptNumber;
}

module.exports = {
  generateReceiptNumber
};
