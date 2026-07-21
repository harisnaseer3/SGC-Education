const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const StudentFee = require('./models/StudentFee');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const fees = await StudentFee.find({ 'vouchers.voucherNumber': { $exists: true } }).select('student vouchers.voucherNumber');
  
  const results = fees.map(f => ({
    student: f.student,
    vouchers: f.vouchers.map(v => v.voucherNumber)
  }));
  
  console.log(JSON.stringify(results, null, 2));
  
  // also check max aggregate
  const maxVoucherResult = await StudentFee.aggregate([
      {
        $unwind: '$vouchers'
      },
      {
        $match: {
          'vouchers.voucherNumber': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          maxVoucherNumber: { $max: '$vouchers.voucherNumber' }
        }
      }
    ]);
  console.log('Max voucher aggregate:', maxVoucherResult);
  
  process.exit(0);
}

check().catch(console.error);
