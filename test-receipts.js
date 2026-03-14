const mongoose = require('mongoose');
const feeService = new (require('./server/services/fee.service'))();

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/SGCEducation');
  const user = { role: 'super_admin' };
  
  const Institution = require('./server/models/Institution');
  const inst = await Institution.findOne();
  if(!inst) { console.log("No inst"); process.exit(0); }
  
  const resId = await feeService.getPayments({ institution: inst._id, studentId: '1' }, user);
  console.log("studentId: 1 count =", resId.length);
  
  const resRoll = await feeService.getPayments({ institution: inst._id, rollNumber: '1' }, user);
  console.log("rollNumber: 1 count =", resRoll.length);
  
  process.exit(0);
}
run().catch(console.error);
