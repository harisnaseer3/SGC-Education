const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const FeePayment = require('../models/FeePayment');
const StudentFee = require('../models/StudentFee');
const AcademicCalendar = require('../models/AcademicCalendar');
const Admission = require('../models/Student');
const Group = require('../models/Group');
const Student = require('../models/Student');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { buildInstitutionQuery } = require('../middleware/institution.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

const activeStudentLookupStages = [
  {
    $lookup: {
      from: 'students',
      localField: 'student',
      foreignField: '_id',
      as: 'studentDoc'
    }
  },
  { $unwind: { path: '$studentDoc', preserveNullAndEmptyArrays: false } },
  { $match: { 'studentDoc.isActive': { $ne: false } } }
];

// Helper: compute dynamic voucher stats matching FeeManagement page logic
const fetchDynamicVoucherStats = async (matchQuery, dateFilter = null) => {
  // Fetch all student fees for the query, populated with feeHead and student
  const allStudentFees = await StudentFee.find(matchQuery)
    .populate({ path: 'feeHead', select: 'name' })
    .populate({ path: 'student', select: '_id isActive' })
    .lean();

  // Filter out fees of inactive students
  const activeStudentFees = allStudentFees.filter(sf => sf.student && sf.student.isActive !== false);

  // Group fees by studentId
  const feesByStudent = new Map();
  activeStudentFees.forEach(sf => {
    const sId = (sf.student?._id || sf.student).toString();
    if (!feesByStudent.has(sId)) {
      feesByStudent.set(sId, []);
    }
    feesByStudent.get(sId).push(sf);
  });

  // Collect all voucher keys: `${month}-${year}`
  const monthlyMap = new Map(); // key -> { month, year, vouchers: [] }

  feesByStudent.forEach((studentFees, studentId) => {
    // Find all unique (month, year) vouchers for this student
    const studentVouchersMap = new Map();

    studentFees.forEach(sf => {
      if (sf.vouchers && Array.isArray(sf.vouchers) && sf.vouchers.length > 0) {
        sf.vouchers.forEach(v => {
          if (v && v.month && v.year) {
            if (dateFilter && (dateFilter.startDate || dateFilter.endDate)) {
              let genDate = v.generatedAt ? new Date(v.generatedAt) : (sf.createdAt ? new Date(sf.createdAt) : null);
              if (!genDate) {
                genDate = new Date(Number(v.year), Number(v.month) - 1, 15);
              }
              if (dateFilter.startDate && genDate < dateFilter.startDate) return;
              if (dateFilter.endDate && genDate > dateFilter.endDate) return;
            }

            const key = `${v.month}-${v.year}`;
            if (!studentVouchersMap.has(key)) {
              studentVouchersMap.set(key, { month: Number(v.month), year: Number(v.year) });
            }
          }
        });
      }
    });

    // For each voucher of this student
    studentVouchersMap.forEach(({ month, year }, key) => {
      // 1. Find fees associated with this voucher
      const feesWithVoucher = studentFees.filter(sf => 
        sf.vouchers && sf.vouchers.some(v => v && Number(v.month) === month && Number(v.year) === year)
      );

      let voucherAmount = 0;
      let regularPaid = 0;
      let regularRemaining = 0;
      let arrearsPaymentsOnVoucher = 0;

      feesWithVoucher.forEach(sf => {
        const isArrearsHead = sf.feeHead?.name?.toLowerCase() === 'arrears';
        if (!isArrearsHead) {
          voucherAmount += parseFloat(sf.finalAmount || 0);
          regularPaid += parseFloat(sf.paidAmount || 0);
          regularRemaining += Math.max(0, parseFloat(sf.finalAmount || 0) - parseFloat(sf.paidAmount || 0));
        } else {
          arrearsPaymentsOnVoucher += parseFloat(sf.paidAmount || 0);
        }
      });

      // 2. Calculate dynamic arrears from PREVIOUS periods
      let totalBilledPrev = 0;
      let totalPaidPrev = 0;

      studentFees.forEach(f => {
        const hasVouchers = f.vouchers && f.vouchers.length > 0;
        let isPrevious = false;

        if (hasVouchers) {
          isPrevious = f.vouchers.every(v => 
            (Number(v.year) < year) || 
            (Number(v.year) === year && Number(v.month) < month)
          );
        }

        if (isPrevious) {
          const isArrearsHead = f.feeHead?.name?.toLowerCase() === 'arrears';
          if (!isArrearsHead) {
            totalBilledPrev += parseFloat(f.finalAmount || 0);
          }
          totalPaidPrev += parseFloat(f.paidAmount || 0);
        }
      });

      const outstandingPrevArrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);
      const calculatedArrears = Math.max(0, outstandingPrevArrears - arrearsPaymentsOnVoucher);
      const displayedRemaining = regularRemaining + calculatedArrears;
      const totalPaidForVoucher = regularPaid + arrearsPaymentsOnVoucher;
      const displayedBilled = voucherAmount + calculatedArrears;

      // Determine status
      let voucherStatus = 'unpaid';
      if (displayedRemaining <= 0.01) {
        voucherStatus = 'paid';
      } else if (totalPaidForVoucher > 0) {
        voucherStatus = 'partial';
      } else {
        voucherStatus = 'unpaid';
      }

      const voucherData = {
        studentId,
        month,
        year,
        voucherAmount,
        arrears: calculatedArrears,
        displayedBilled,
        totalPaid: totalPaidForVoucher,
        displayedRemaining,
        regularRemaining,
        calculatedArrears,
        voucherStatus
      };

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month, year, vouchers: [] });
      }
      monthlyMap.get(key).vouchers.push(voucherData);
    });
  });

  const aggregateVoucherList = (voucherList) => {
    let total = voucherList.length;
    let paid = 0;
    let unpaid = 0;
    let partial = 0;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalArrears = 0;
    let collectedPaid = 0;
    let collectedPartial = 0;
    let outstandingRegular = 0;
    let outstandingArrears = 0;

    voucherList.forEach(v => {
      if (v.voucherStatus === 'paid') paid++;
      else if (v.voucherStatus === 'partial') partial++;
      else unpaid++;

      totalBilled += v.displayedBilled;
      totalCollected += v.totalPaid;
      totalOutstanding += v.displayedRemaining;
      totalArrears += v.arrears;

      if (v.voucherStatus === 'paid') collectedPaid += v.totalPaid;
      else if (v.voucherStatus === 'partial') collectedPartial += v.totalPaid;

      outstandingRegular += v.regularRemaining;
      outstandingArrears += v.calculatedArrears;
    });

    return {
      total,
      paid,
      unpaid,
      partial,
      totalBilled,
      totalCollected,
      totalOutstanding,
      totalArrears,
      collectedPaid,
      collectedPartial,
      outstandingRegular,
      outstandingArrears
    };
  };

  const monthlyBreakdown = [];
  let allTimeVouchers = [];

  monthlyMap.forEach(({ month, year, vouchers }) => {
    const stats = aggregateVoucherList(vouchers);
    monthlyBreakdown.push({
      _id: { month, year },
      ...stats
    });
    allTimeVouchers.push(...vouchers);
  });

  monthlyBreakdown.sort((a, b) => {
    if (a._id.year !== b._id.year) return b._id.year - a._id.year;
    return b._id.month - a._id.month;
  });

  const allTime = aggregateVoucherList(allTimeVouchers);

  return {
    allTime,
    monthlyBreakdown
  };
};

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get overall system statistics (institution-filtered for super admin)
 * @access  Private (Super Admin and Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // If user is a finance manager, handle with dedicated logic
  if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id name code');
    const institutionIds = institutions.map(i => i._id);

    const { startDate, endDate, institution } = req.query;
    const hasDates = startDate && endDate;
    let parsedStartDate, parsedEndDate;
    if (hasDates) {
      parsedStartDate = new Date(startDate);
      parsedStartDate.setHours(0, 0, 0, 0);
      parsedEndDate = new Date(endDate);
      parsedEndDate.setHours(23, 59, 59, 999);
    }

    let selectedInstitutionIds = institutionIds;
    if (institution) {
      const requestedInstId = extractInstitutionId(institution);
      if (institutionIds.some(id => id.toString() === requestedInstId.toString())) {
        selectedInstitutionIds = [new mongoose.Types.ObjectId(requestedInstId)];
      } else {
        throw new ApiError(403, 'Access denied. The requested campus does not belong to your organization.');
      }
    }

    // Student filters
    const studentTotalFilter = { institution: { $in: selectedInstitutionIds } };
    const studentActiveFilter = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    const studentNewAdmissionsFilter = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    const studentStruckOffFilter = { institution: { $in: selectedInstitutionIds }, status: 'struckoff' };
    
    if (endDate) {
      const parsedEnd = new Date(endDate);
      parsedEnd.setHours(23, 59, 59, 999);
      studentTotalFilter.createdAt = { $lte: parsedEnd };
      studentActiveFilter.createdAt = { $lte: parsedEnd };
      studentStruckOffFilter.createdAt = { $lte: parsedEnd };
    }
    
    if (hasDates) {
      studentNewAdmissionsFilter.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      studentNewAdmissionsFilter.admissionDate = { $gte: thirtyDaysAgo };
    }
    
    const [totalStudents, activeStudents, newAdmissions, struckOffStudents, finVoucherStats] = await Promise.all([
      Admission.countDocuments(studentTotalFilter),
      Admission.countDocuments(studentActiveFilter),
      Admission.countDocuments(studentNewAdmissionsFilter),
      Student.countDocuments(studentStruckOffFilter),
      fetchDynamicVoucherStats({ institution: { $in: selectedInstitutionIds }, 'vouchers.0': { $exists: true } })
    ]);

    const overallFinStats = finVoucherStats.allTime;
    const totalCollected = overallFinStats.totalCollected;
    const totalBilled = overallFinStats.totalBilled;
    const totalOutstanding = overallFinStats.totalOutstanding;
    const previousReceivableVal = overallFinStats.totalArrears;
    const recoveryVal = overallFinStats.collectedPaid;

    // Campus Breakdown
    const campusBreakdown = await Promise.all(institutions.map(async (inst) => {
      const instId = inst._id;

      const [
        totalStudentsCount,
        activeStudentsCount,
        newAdmissionsCount,
        instVoucherStats
      ] = await Promise.all([
        Admission.countDocuments({ institution: instId, ...(parsedEndDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ institution: instId, status: 'enrolled', ...(parsedEndDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ 
          institution: instId, 
          status: 'enrolled',
          admissionDate: hasDates 
            ? { $gte: parsedStartDate, $lte: parsedEndDate } 
            : { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        }),
        fetchDynamicVoucherStats({ institution: instId, 'vouchers.0': { $exists: true } })
      ]);
      
      const instFinStats = instVoucherStats.allTime;

      return {
        _id: instId,
        name: inst.name,
        code: inst.code,
        totalStudents: totalStudentsCount,
        activeStudents: activeStudentsCount,
        newAdmissions: newAdmissionsCount,
        feesGenerated: instFinStats.totalBilled,
        feesCollected: instFinStats.totalCollected,
        outstandingDues: instFinStats.totalOutstanding,
        previousReceivable: instFinStats.totalArrears,
        recovery: instFinStats.collectedPaid
      };
    }));

    // Trends calculations for charts
    const paymentTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'completed' };
    const admissionTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    
    if (hasDates) {
      paymentTrendMatch.$or = [
        { paymentDate: { $gte: parsedStartDate, $lte: parsedEndDate } },
        { createdAt: { $gte: parsedStartDate, $lte: parsedEndDate } }
      ];
      admissionTrendMatch.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      paymentTrendMatch.$or = [
        { paymentDate: { $gte: ninetyDaysAgo } },
        { createdAt: { $gte: ninetyDaysAgo } }
      ];
      admissionTrendMatch.admissionDate = { $gte: ninetyDaysAgo };
    }
    
    const [feeCollectionTrend, admissionTrend] = await Promise.all([
      FeePayment.aggregate([
        { $match: paymentTrendMatch },
        ...activeStudentLookupStages,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: '+05:00' } },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Admission.aggregate([
        { $match: admissionTrendMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate', timezone: '+05:00' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalInstitutions: institutions.length,
          activeInstitutions: institutions.length,
          totalStudents,
          activeStudents,
          newAdmissions,
          struckOffStudents
        },
        finance: {
          totalCollected,
          totalBilled,
          totalOutstanding,
          previousReceivable: previousReceivableVal,
          recovery: recoveryVal,
          currency: 'PKR'
        },
        campusBreakdown,
        trends: {
          feeCollectionTrend: feeCollectionTrend.map(t => ({ date: t._id, amount: t.amount })),
          admissionTrend: admissionTrend.map(t => ({ date: t._id, count: t.count }))
        }
      }
    });
  }

  // Build filters based on user role
  let institutionQuery = {}; // For Institution model (_id)
  let referenceQuery = {};   // For models referring to institution (institution)
  let userQuery = {};        // For User model (institution)

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    const institutionId = extractInstitutionId(req.query.institution);
    institutionQuery = { _id: institutionId };
    const objectId = new mongoose.Types.ObjectId(institutionId);
    referenceQuery = { institution: objectId };
    userQuery = { institution: institutionId };
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin') {
    const institutionId = getInstitutionId(req.user);
    if (!institutionId) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    }
    institutionQuery = { _id: institutionId };
    const objectId = new mongoose.Types.ObjectId(institutionId);
    referenceQuery = { institution: objectId };
    userQuery = { institution: institutionId };
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No filters - show everything
  }
  // For finance manager (scoped to their organization's institutions)
  else if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id name code');
    const institutionIds = institutions.map(i => i._id);
    institutionQuery = { _id: { $in: institutionIds } };
    referenceQuery = { institution: { $in: institutionIds } };
    userQuery = { institution: { $in: institutionIds } };
    req.financeInstitutions = institutions; // Save for breakdown
  }
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  const classId = req.query.class;
  const classObjectId = (classId && mongoose.Types.ObjectId.isValid(classId)) 
    ? new mongoose.Types.ObjectId(classId) 
    : null;

  const studentMatchQuery = classObjectId ? { ...referenceQuery, class: classObjectId } : referenceQuery;
  const studentFeeMatchQuery = classObjectId ? { ...referenceQuery, class: classObjectId } : referenceQuery;

  // Parse optional date range for financial overview filtering
  const { startDate: startDateStr, endDate: endDateStr } = req.query;
  const hasDateFilter = !!(startDateStr && endDateStr);
  const parsedStartDate = hasDateFilter ? new Date(startDateStr) : null;
  const parsedEndDate   = hasDateFilter ? new Date(endDateStr)   : null;

  // Get counts
  const [
    totalInstitutions,
    activeInstitutions,
    inactiveInstitutions,
    totalSchools,
    totalColleges,
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    recentInstitutions
  ] = await Promise.all([
    Institution.countDocuments(institutionQuery),
    Institution.countDocuments({ ...institutionQuery, isActive: true }),
    Institution.countDocuments({ ...institutionQuery, isActive: false }),
    Institution.countDocuments({ ...institutionQuery, type: 'school' }),
    Institution.countDocuments({ ...institutionQuery, type: 'college' }),
    User.countDocuments(userQuery),
    Student.countDocuments(studentMatchQuery),
    User.countDocuments({ ...userQuery, role: 'teacher' }),
    User.countDocuments({ ...userQuery, role: 'admin' }),
    Institution.find(institutionQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name type code isActive createdAt')
      .populate('createdBy', 'name')
  ]);

  // Get institution type breakdown
  const institutionTypeBreakdown = {
    schools: totalSchools,
    colleges: totalColleges
  };

  // Get institution status breakdown
  const institutionStatusBreakdown = {
    active: activeInstitutions,
    inactive: inactiveInstitutions
  };

  // Get user role breakdown
  const userRoleBreakdown = {
    students: totalStudents,
    teachers: totalTeachers,
    admins: totalAdmins,
    superAdmin: await User.countDocuments({ role: 'super_admin' })
  };

  // Financial Statistics
  const startOfLastMonth = new Date();
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
  startOfLastMonth.setDate(1);
  startOfLastMonth.setHours(0, 0, 0, 0);

  const endOfLastMonth = new Date();
  endOfLastMonth.setDate(0);
  endOfLastMonth.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }



  const [
    lastMonthFees,
    recentInstitutionsCount,
    recentUsersCount,
    enrolledStudentsCount,
    newAdmissionsCount,
    overdueFeesCount,
    upcomingEvents,
    struckOffStudentsCount,
    dynamicVoucherData
  ] = await Promise.all([
    // Last Month's Fees
    FeePayment.aggregate([
      { 
        $match: { 
          ...referenceQuery, 
          status: 'completed',
          paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      ...activeStudentLookupStages,
      ...(classObjectId ? [{ $match: { 'studentDoc.class': classObjectId } }] : []),
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Institution.countDocuments({ ...institutionQuery, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ ...userQuery, createdAt: { $gte: thirtyDaysAgo } }),
    // Enrolled Students
    Admission.countDocuments({ ...studentMatchQuery, status: 'enrolled' }),
    // New Admissions (last 30 days)
    Admission.countDocuments({ ...studentMatchQuery, admissionDate: { $gte: thirtyDaysAgo } }),
    // Overdue Fees
    StudentFee.countDocuments({ ...studentFeeMatchQuery, status: 'overdue', isActive: true }),
    // Upcoming Events
    AcademicCalendar.find({ 
      ...referenceQuery, 
      startDate: { $gte: new Date() } 
    }).sort({ startDate: 1 }).limit(5),
    // Struck Off Students
    Student.countDocuments({ ...studentMatchQuery, status: 'struckoff' }),

    // Dynamic Voucher Stats
    fetchDynamicVoucherStats({ ...studentFeeMatchQuery, 'vouchers.0': { $exists: true } }, hasDateFilter ? { startDate: parsedStartDate, endDate: parsedEndDate } : null)
  ]);

  const { allTime: allTimeVouchersAgg, monthlyBreakdown: monthlyBreakdownAgg } = dynamicVoucherData;

  const emptyVoucherStats = { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, totalArrears: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 };

  const currentMonthVouchersAgg = monthlyBreakdownAgg.find(m => m._id.month === currentMonth && m._id.year === currentYear) || emptyVoucherStats;
  const prevMonthVouchersAgg = monthlyBreakdownAgg.find(m => m._id.month === prevMonth && m._id.year === prevYear) || emptyVoucherStats;

  const activeFinStats = hasDateFilter ? allTimeVouchersAgg : currentMonthVouchersAgg;
  const totalCollected = activeFinStats.totalCollected;
  const totalBilled    = activeFinStats.totalBilled;
  const totalOutstanding = activeFinStats.totalOutstanding;
  const lastMonthTotal = lastMonthFees[0]?.total || 0;

  // Campus Breakdown for Finance Managers
  let campusBreakdown = [];
  if (req.user.role === 'finance_manager' && req.financeInstitutions) {
    campusBreakdown = await Promise.all(req.financeInstitutions.map(async (inst) => {
      const instQuery = { institution: inst._id };
      const [students, received, receivable] = await Promise.all([
        Student.countDocuments(instQuery),
        FeePayment.aggregate([
          { $match: { ...instQuery, status: 'completed' } },
          ...activeStudentLookupStages,
          { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
        ]),
        StudentFee.aggregate([
          { $match: { ...instQuery, 'vouchers.0': { $exists: true } } },
          ...activeStudentLookupStages,
          { $group: { _id: null, totalBilled: { $sum: '$finalAmount' }, totalOutstanding: { $sum: '$remainingAmount' } } }
        ])
      ]);
      
      return {
        _id: inst._id,
        name: inst.name,
        code: inst.code,
        totalStudents: students,
        collected: received[0]?.totalCollected || 0,
        billed: receivable[0]?.totalBilled || 0,
        outstanding: receivable[0]?.totalOutstanding || 0
      };
    }));
  }

  res.json({
    success: true,
    data: {
      overview: {
        totalInstitutions,
        activeInstitutions,
        inactiveInstitutions,
        totalUsers
      },
      institutions: {
        total: totalInstitutions,
        active: activeInstitutions,
        inactive: inactiveInstitutions,
        typeBreakdown: institutionTypeBreakdown,
        statusBreakdown: institutionStatusBreakdown
      },
      users: {
        total: totalUsers,
        roleBreakdown: userRoleBreakdown
      },
      growth: {
        institutionsLast30Days: recentInstitutionsCount,
        usersLast30Days: recentUsersCount,
      },
      finance: {
        totalBilled,
        totalCollected,
        totalOutstanding,
        lastMonthCollected: lastMonthTotal,
        currency: 'PKR'
      },
      administrative: {
        enrolledStudents: enrolledStudentsCount,
        newAdmissions: newAdmissionsCount,
        overdueFees: overdueFeesCount,
        struckOffStudents: struckOffStudentsCount
      },
      vouchers: {
        allTime: allTimeVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        currentMonth: currentMonthVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        prevMonth: prevMonthVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        monthlyBreakdown: monthlyBreakdownAgg || []
      },
      upcomingEvents,
      recentInstitutions,
      campusBreakdown
    }
  });
});

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get analytics data (growth trends, charts)
 * @access  Private (Super Admin and Admin)
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { days = 30, institution } = req.query;
  const daysNum = parseInt(days);

  // Normalize startDate to the beginning of the day (00:00:00)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  startDate.setHours(0, 0, 0, 0);

  const institutionId = institution || (req.user.role === 'admin' ? getInstitutionId(req.user) : null);

  // Base match conditions for growth charts
  const userMatch = { isActive: true, createdAt: { $gte: startDate } };
  const groupMatch = { isActive: true, createdAt: { $gte: startDate } };
  const institutionGrowthMatch = { isActive: true, createdAt: { $gte: startDate } };
  const classDistributionMatch = { status: { $in: ['active', 'enrolled'] }, isActive: true };
  // Students use admissionDate (official enrolment date) instead of createdAt
  const studentMatch = { status: 'enrolled', admissionDate: { $gte: startDate } };

  if (institutionId) {
    const oid = new mongoose.Types.ObjectId(institutionId);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
    classDistributionMatch.institution = oid;
    studentMatch.institution = oid;
  }
  else if (req.user.role === 'admin') {
    const id = getInstitutionId(req.user);
    if (!id) throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    const oid = new mongoose.Types.ObjectId(id);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
    classDistributionMatch.institution = oid;
    studentMatch.institution = oid;
  }
  else if (req.user.role === 'super_admin') {
    // No specific institution filter
  }
  else if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id');
    const institutionIds = institutions.map(i => i._id);
    institutionGrowthMatch._id = { $in: institutionIds };
    userMatch.institution = { $in: institutionIds };
    groupMatch.institution = { $in: institutionIds };
    classDistributionMatch.institution = { $in: institutionIds };
    studentMatch.institution = { $in: institutionIds };
  }
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  // Get daily growth trends
  const [institutionTrends, nonStudentTrends, studentTrends, departmentTrends, classDistribution] = await Promise.all([
    Institution.aggregate([
      { $match: institutionGrowthMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    User.aggregate([
      { $match: { ...userMatch, role: { $ne: 'student' } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      }
    ]),

    Admission.aggregate([
      { $match: studentMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate', timezone: '+05:00' } },
            role: { $literal: 'student' }
          },
          count: { $sum: 1 }
        }
      }
    ]),

    Group.aggregate([
      { $match: groupMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    Student.aggregate([
      { $match: classDistributionMatch },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classDetails'
        }
      },
      { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$classDetails.name', 'Unassigned'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          students: '$count',
          _id: 0
        }
      },
      { $sort: { students: -1 } }
    ])
  ]);

  // Combine and sort user trends
  let userTrends = [...nonStudentTrends, ...studentTrends];
  userTrends.sort((a, b) => {
    if (a._id.date === b._id.date) return 0;
    return a._id.date < b._id.date ? -1 : 1;
  });

  // Get activity trends if available
  let activityTrends = [];
  try {
    activityTrends = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  } catch (err) {
    // ActivityLog might not exist yet
    console.log('ActivityLog not available');
  }

  res.json({
    success: true,
    data: {
      institutionTrends,
      userTrends,
      departmentTrends, // Fulfills frontend's department growth chart (using Groups)
      activityTrends,
      classDistribution,
      period: {
        days: daysNum,
        startDate,
        endDate: new Date()
      }
    }
  });
});

module.exports = {
  getDashboardStats,
  getAnalytics
};
