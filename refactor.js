const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'server/services/admission.service.js');
let code = fs.readFileSync(file, 'utf8');

// 1. Remove _createStudentFromAdmission method
code = code.replace(/\/\*\*\s*\n\s*\*\s*Helper:\s*Create student record from admission[\s\S]*?return student;\n\s*\}/g, '');

// 2. In updateAdmissionStatus, remove student creation logic
code = code.replace(/if\s*\(status\s*===\s*'enrolled'\)\s*\{[\s\S]*?\}\s*else\s*if\s*\(status\s*===\s*'struck_off'/g, `if (status === 'enrolled') {
      // Already handled by saving status. No need to create a separate student.
    } else if (status === 'struck_off'`);

// 3. In bulkUpdateStatus, remove student creation logic
code = code.replace(/if\s*\(status\s*===\s*'enrolled'\)\s*\{[\s\S]*?results\.enrolledStudents\s*=\s*\(results\.enrolledStudents\s*\|\|\s*0\)\s*\+\s*1;\s*\}\s*catch\s*\(studentErr\)\s*\{[\s\S]*?\}\s*\}/g, `if (status === 'enrolled') {
          results.enrolledStudents = (results.enrolledStudents || 0) + 1;
        }`);

// 4. In approveAndEnroll, simplify to just update status
code = code.replace(/const student = await this\._createStudentFromAdmission\(admission, currentUser\);[\s\S]*?return\s*\{[\s\S]*?\};/g, `
    admission.status = 'enrolled';
    admission.statusHistory.push({
      status: 'enrolled',
      remarks: 'Approved and enrolled successfully',
      changedBy: currentUser.id,
      changedAt: Date.now()
    });
    await admission.save();

    return {
      admission,
      student: admission // Admission is the student now
    };
`);

// 5. In deleteAdmission and permanentlyDeleteAdmission, remove student deletion
code = code.replace(/\/\/ Also inactivate student if exists[\s\S]*?if\s*\(admission\.studentId\)\s*\{[\s\S]*?\}/g, '');
code = code.replace(/\/\/ 1\. If student exists, delete all student related data[\s\S]*?\/\/ 2\. Delete the Admission Record/g, `
      // Clean up related data
      const studentId = admission._id;
      await StudentFee.deleteMany({ student: studentId });
      await FeeVoucher.deleteMany({ student: studentId });
      await FeePayment.deleteMany({ student: studentId });
      await StudentPromotion.deleteMany({ student: studentId });
      await Result.deleteMany({ student: studentId });

      // 2. Delete the Record
`);

// 6. Fix references to admission.studentId -> we no longer have this. 
// Just remove those checks or change to admission._id where needed.
code = code.replace(/admission\.studentId/g, 'admission._id');
code = code.replace(/populate\(\{\s*path:\s*'studentId'[\s\S]*?\}\)/g, ''); // Remove populate studentId

// 7. Fix getAdmissionStats statuses
code = code.replace(/'approved'/g, "'enrolled'"); // Map approved to enrolled for stats
code = code.replace(/'rejected'/g, "'struckoff'");

fs.writeFileSync(file, code);
console.log('Refactored admission.service.js');
