const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./models/Student');
require('./models/Class');
require('./models/Section');
require('./models/Institution');
require('./models/FeeHead');
require('./models/FeeType');
require('./models/StudentFee');
require('./models/FeePayment');
require('./models/FeeVoucher');
const feeService = require('./services/fee.service');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const ledger = await feeService.getStudentLedger('6a5b1dc07cfca59e3edc0bf3', {}, { role: 'super_admin' });
  console.log('VOUCHER ROWS:');
  console.table(ledger.voucherRows.map(r => ({
    voucherNumber: r.voucherNumber,
    feeMonth: r.feeMonth,
    currentMonthFee: r.currentMonthFee,
    arrears: r.arrears,
    totalPaid: r.totalPaid,
    balance: r.balance,
    paidStatus: r.paidStatus
  })));
  console.log('SUMMARY:', ledger.summary);
  await mongoose.disconnect();
}
run().catch(console.error);
