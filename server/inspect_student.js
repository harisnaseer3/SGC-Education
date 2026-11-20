const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./models/FeeHead');
const StudentFee = require('./models/StudentFee');
const FeePayment = require('./models/FeePayment');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const studentId = '6a5b1dc07cfca59e3edc0bf3';
  const payments = await FeePayment.find({ student: studentId }).lean();
  console.log('--- PAYMENTS ---');
  payments.forEach(p => {
    console.log(`Payment: ${p._id}, Amount: ${p.amount}, Date: ${p.paymentDate}, VoucherNo: ${p.voucherNumber}, studentFee: ${p.studentFee}`);
  });

  const fees = await StudentFee.find({ student: studentId }).populate('feeHead', 'name').lean();
  console.log('\n--- FEES ---');
  fees.forEach(f => {
    const vStr = (f.vouchers || []).map(v => `${v.year}-${v.month} (${v.voucherNumber}) [gen: ${v.generatedAt}]`).join(', ');
    console.log(`Fee: ${f._id}, Head: ${f.feeHead?.name}, Base: ${f.baseAmount}, Final: ${f.finalAmount}, Paid: ${f.paidAmount}, Vouchers: ${vStr}`);
  });

  await mongoose.disconnect();
}
run().catch(console.error);
