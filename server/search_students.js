const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/sgceducation';

async function searchAll() {
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db.collections();
  for (let col of collections) {
    const name = col.collectionName;
    const count = await col.countDocuments();
    console.log(`Collection ${name}: ${count} docs`);
    if (count > 0) {
      const sample = await col.find({}).limit(5).toArray();
      sample.forEach(d => {
        console.log(`  [${name}] ID: ${d._id} | keys: ${Object.keys(d).join(', ')}`);
        if (d.studentName || d.name || d.personalInfo) {
          console.log(`     Name info: ${d.name || d.studentName || JSON.stringify(d.personalInfo)}`);
        }
      });
    }
  }
  await mongoose.disconnect();
}

searchAll().catch(err => console.error(err));
