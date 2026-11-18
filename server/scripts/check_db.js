const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_management');
  const db = mongoose.connection.db;
  
  const bankAccounts = await db.collection('bankaccounts').find({}).toArray();
  console.log('Total bank accounts:', bankAccounts.length);
  bankAccounts.forEach((b, i) => {
    console.log(`${i}: _id=${b._id}, bankName="${b.bankName}", accountTitle="${b.accountTitle}", accountNumber="${b.accountNumber}", isDefault=${b.isDefault}, institution=${b.institution}, createdAt=${b.createdAt}`);
  });

  await mongoose.disconnect();
}
check().catch(console.error);

