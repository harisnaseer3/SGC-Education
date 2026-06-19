const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/sgceducation')
  .then(async () => {
    const db = mongoose.connection.db;
    const students = await db.collection('students').find({}).toArray();
    const admissions = await db.collection('admissions').find({}).toArray();
    
    // Find Aamir
    const aamirAdmissions = admissions.filter(a => a.applicationNumber === '117' || a.rollNumber === '100');
    console.log('Aamir Admissions:', JSON.stringify(aamirAdmissions.map(a => ({ id: a._id, name: a.personalInfo?.name, appNum: a.applicationNumber, status: a.status, statusHistory: a.statusHistory })), null, 2));

    const aamirStudent = students.find(s => aamirAdmissions.some(a => a.studentId && a.studentId.toString() === s._id.toString()));
    console.log('Aamir Student:', aamirStudent ? { id: aamirStudent._id, status: aamirStudent.status } : 'Not found');
    
    process.exit(0);
  })
  .catch(console.error);
