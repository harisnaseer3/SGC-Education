const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/sgc_education').then(async () => {
  const StudentFee = require('./server/models/StudentFee');
  const res = await StudentFee.countDocuments({ 'vouchers.0': { $exists: true } });
  console.log('Total StudentFees with vouchers:', res);
  process.exit(0);
}).catch(console.error);
