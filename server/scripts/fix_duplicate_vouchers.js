const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const StudentFee = require('../models/StudentFee');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const runFix = async () => {
  await connectDB();
  console.log('--- Starting Duplicate Voucher Fix ---');

  try {
    const allFees = await StudentFee.find({ 'vouchers.0': { $exists: true } });
    console.log(`Found ${allFees.length} StudentFee records with vouchers.`);

    let globalMaxSeq = 0;
    
    // First pass: find the global max sequence number and map sequence numbers to student-month-year
    const seqToCombos = new Map();
    
    for (const fee of allFees) {
      const studentId = fee.student?.toString() || 'unknown';
      
      for (const voucher of fee.vouchers) {
        if (!voucher.voucherNumber) continue;
        
        let seqNum = 0;
        const parts = voucher.voucherNumber.split('-');
        const seqStr = parts[parts.length - 1];
        seqNum = parseInt(seqStr, 10);
        
        if (!isNaN(seqNum)) {
          if (seqNum > globalMaxSeq) {
            globalMaxSeq = seqNum;
          }
          
          const comboKey = `${studentId}-${voucher.month}-${voucher.year}`;
          
          if (!seqToCombos.has(seqNum)) {
            seqToCombos.set(seqNum, new Set());
          }
          seqToCombos.get(seqNum).add(comboKey);
        }
      }
    }
    
    console.log(`Global Max Sequence Number found: ${globalMaxSeq}`);
    
    let nextSeq = globalMaxSeq + 1;
    let updatedCount = 0;
    let newSeqAssignedCount = 0;
    
    // Determine which combos need a new sequence number
    const comboToNewSeq = new Map();
    
    for (const [seqNum, combos] of seqToCombos.entries()) {
      if (combos.size > 1) {
        console.log(`Sequence ${seqNum} is duplicated across ${combos.size} different student-month-year combinations!`);
        
        // Keep the first one, assign new sequences to the rest
        const combosArray = Array.from(combos);
        for (let i = 1; i < combosArray.length; i++) {
          const combo = combosArray[i];
          comboToNewSeq.set(combo, nextSeq);
          nextSeq++;
          newSeqAssignedCount++;
        }
      }
    }
    
    if (newSeqAssignedCount === 0) {
      console.log('No duplicate voucher sequences found!');
      process.exit(0);
    }
    
    console.log(`Assigning ${newSeqAssignedCount} new unique sequence numbers...`);
    
    // Second pass: update the vouchers
    for (const fee of allFees) {
      let feeModified = false;
      const studentId = fee.student?.toString() || 'unknown';
      
      for (let i = 0; i < fee.vouchers.length; i++) {
        const voucher = fee.vouchers[i];
        if (!voucher.voucherNumber) continue;
        
        const comboKey = `${studentId}-${voucher.month}-${voucher.year}`;
        
        if (comboToNewSeq.has(comboKey)) {
          const newSeq = comboToNewSeq.get(comboKey);
          
          // Generate new voucher number string while preserving the prefix if it exists
          let newVoucherNumber = '';
          const parts = voucher.voucherNumber.split('-');
          const newSeqStr = String(newSeq).padStart(5, '0');
          
          if (parts.length > 1) {
            // It has a prefix like VCH-2026-07
            parts[parts.length - 1] = newSeqStr;
            newVoucherNumber = parts.join('-');
          } else {
            // It was just the sequence number
            newVoucherNumber = newSeqStr;
          }
          
          fee.vouchers[i].voucherNumber = newVoucherNumber;
          feeModified = true;
        }
      }
      
      if (feeModified) {
        await fee.save();
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} StudentFee records with unique sequence numbers.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

runFix();
