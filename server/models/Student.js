const mongoose = require('mongoose');
const SequenceCounter = require('./SequenceCounter');

const studentSchema = new mongoose.Schema({
  // Institution
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },

  // Student Identification
  applicationNumber: {
    type: String,
    uppercase: true
  },
  enrollmentNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  rollNumber: {
    type: String,
    uppercase: true,
    trim: true
  },

  // Admission & Academic Details
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  program: {
    type: String,
    required: [true, 'Please provide program'],
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  batch: {
    type: String,
    trim: true
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  admissionEffectiveDate: {
    type: Date
  },

  // Personal Details
  personalDetails: {
    name: {
      type: String,
      required: [true, 'Please provide name'],
      trim: true
    },
    middleName: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      trim: true
    },
    nationality: {
      type: String,
      required: [true, 'Please provide nationality'],
      default: 'Pakistani',
      trim: true
    },
    religion: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'Other'],
      default: 'General'
    },
    aadharNumber: {
      type: String,
      trim: true
    },
    photo: {
      type: String,
      trim: true
    }
  },

  // Contact Details
  contactDetails: {
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    currentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    sameAsCurrent: {
      type: Boolean,
      default: false
    }
  },

  // Guardian Information
  guardianInfo: {
    fatherName: {
      type: String,
      trim: true
    },
    fatherCnic: {
      type: String,
      trim: true
    },
    fatherOccupation: {
      type: String,
      trim: true
    },
    fatherPhone: {
      type: String,
      trim: true
    },
    motherName: {
      type: String,
      trim: true
    },
    motherCnic: {
      type: String,
      trim: true
    },
    motherOccupation: {
      type: String,
      trim: true
    },
    motherPhone: {
      type: String,
      trim: true
    },
    guardianName: {
      type: String,
      trim: true
    },
    guardianRelation: {
      type: String,
      trim: true
    },
    guardianCnic: {
      type: String,
      trim: true
    },
    guardianPhone: {
      type: String,
      trim: true
    },
    guardianEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    annualIncome: {
      type: Number
    }
  },

  // Academic Background
  academicBackground: {
    previousSchool: {
      type: String,
      trim: true
    },
    previousBoard: {
      type: String,
      trim: true
    },
    previousClass: {
      type: String,
      trim: true
    },
    previousPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    yearOfPassing: {
      type: Number
    }
  },

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['photo', 'birth_certificate', 'marksheet', 'previous_marksheet', 'transfer_certificate', 'caste_certificate', 'income_certificate', 'aadhar', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Unified Status
  status: {
    type: String,
    enum: ['pending', 'enrolled', 'struckoff', 'passout', 'approved', 'rejected', 'cancelled', 'soft_admission', 'expelled', 'freeze', 'school_leaving', 'struck_off'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'enrolled', 'struckoff', 'passout', 'approved', 'rejected', 'cancelled', 'soft_admission', 'expelled', 'freeze', 'school_leaving', 'struck_off']
    },
    remarks: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Application Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewRemarks: {
    type: String,
    trim: true
  },

  // Application Fee
  applicationFee: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    },
    transactionId: {
      type: String,
      trim: true
    }
  },

  // Tracking / Performance Stats
  currentSemester: {
    type: Number,
    min: 1
  },
  currentYear: {
    type: Number,
    min: 1
  },
  stats: {
    totalAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageGrade: {
      type: String,
      trim: true
    },
    totalCourses: {
      type: Number,
      default: 0
    },
    completedCourses: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook
studentSchema.pre('save', async function() {
  this.updatedAt = Date.now();

  // Generate unique application number if missing and status is pending
  if (!this.applicationNumber && this.isNew) {
    const counter = await SequenceCounter.findOneAndUpdate(
      { institution: this.institution, type: 'admission' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.applicationNumber = String(counter.seq);
  }

  // Generate unique enrollment number if status is enrolled and missing
  if (this.status === 'enrolled' && !this.enrollmentNumber) {
    const counter = await SequenceCounter.findOneAndUpdate(
      { institution: this.institution, type: 'enrollment' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.enrollmentNumber = String(counter.seq);
  }
  
  // Generate roll number if missing and enrolled
  if (this.status === 'enrolled' && !this.rollNumber) {
    const latestStudent = await mongoose.model('Student').findOne({ institution: this.institution })
      .sort({ rollNumber: -1 })
      .select('rollNumber');

    let maxRoll = 99;
    if (latestStudent && latestStudent.rollNumber) {
      const rollNum = parseInt(latestStudent.rollNumber);
      if (!isNaN(rollNum)) maxRoll = Math.max(maxRoll, rollNum);
    }
    this.rollNumber = String(maxRoll + 1);
  }
});

// Indexes for better query performance
studentSchema.index({ enrollmentNumber: 1, institution: 1 }, { unique: true, sparse: true });
studentSchema.index({ applicationNumber: 1, institution: 1 }, { unique: true, sparse: true });
studentSchema.index({ institution: 1 });
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ batch: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ createdAt: -1 });

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  let name = this.personalDetails?.name || '';
  if (this.personalDetails?.middleName) {
    name += ' ' + this.personalDetails.middleName;
  }
  return name.trim();
});

// Virtual for backward compatibility with frontend expecting personalInfo
studentSchema.virtual('personalInfo').get(function() {
  return this.personalDetails;
});

// Virtual for backward compatibility with frontend expecting admission object
studentSchema.virtual('admission').get(function() {
  return {
    _id: this._id,
    personalInfo: this.personalDetails,
    guardianInfo: this.guardianInfo,
    contactInfo: this.contactInfo,
    status: this.status,
    applicationNumber: this.applicationNumber,
    admissionEffectiveDate: this.admissionEffectiveDate,
    admissionDate: this.admissionDate,
    statusHistory: this.statusHistory,
    class: this.class,
    section: this.section
  };
});

// Enable virtuals in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', studentSchema);
