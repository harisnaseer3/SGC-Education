const mongoose = require('mongoose');
const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const Institution = require('../models/Institution');
const Student = require('../models/Student');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Helper: Calculate dynamic voucher stats matching internal system logic
 */
const calculateERPCollectionStats = async (institutionFilter = {}) => {
  const matchQuery = { ...institutionFilter, 'vouchers.0': { $exists: true } };

  const allStudentFees = await StudentFee.find(matchQuery)
    .populate({ path: 'feeHead', select: 'name' })
    .populate({ path: 'student', select: '_id isActive' })
    .lean();

  // Filter out inactive students
  const activeStudentFees = allStudentFees.filter(sf => sf.student && sf.student.isActive !== false);

  const feesByStudent = new Map();
  activeStudentFees.forEach(sf => {
    const sId = (sf.student?._id || sf.student).toString();
    if (!feesByStudent.has(sId)) {
      feesByStudent.set(sId, []);
    }
    feesByStudent.get(sId).push(sf);
  });

  const allTimeVouchers = [];

  feesByStudent.forEach((studentFees) => {
    const studentVouchersMap = new Map();

    studentFees.forEach(sf => {
      if (sf.vouchers && Array.isArray(sf.vouchers)) {
        sf.vouchers.forEach(v => {
          if (v && v.month && v.year) {
            const key = `${v.month}-${v.year}`;
            if (!studentVouchersMap.has(key)) {
              studentVouchersMap.set(key, { month: Number(v.month), year: Number(v.year) });
            }
          }
        });
      }
    });

    studentVouchersMap.forEach(({ month, year }) => {
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

      let voucherStatus = 'unpaid';
      if (displayedRemaining <= 0.01) {
        voucherStatus = 'paid';
      } else if (totalPaidForVoucher > 0) {
        voucherStatus = 'partial';
      } else {
        voucherStatus = 'unpaid';
      }

      allTimeVouchers.push({
        displayedBilled,
        totalPaid: totalPaidForVoucher,
        displayedRemaining,
        arrears: calculatedArrears,
        voucherStatus
      });
    });
  });

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let totalArrears = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;

  allTimeVouchers.forEach(v => {
    totalBilled += v.displayedBilled;
    totalCollected += v.totalPaid;
    totalOutstanding += v.displayedRemaining;
    totalArrears += v.arrears;

    if (v.voucherStatus === 'paid') paidCount++;
    else if (v.voucherStatus === 'partial') partialCount++;
    else unpaidCount++;
  });

  return {
    totalBilled: Math.round(totalBilled),
    totalCollected: Math.round(totalCollected),
    totalOutstanding: Math.round(totalOutstanding),
    totalArrears: Math.round(totalArrears),
    vouchers: {
      total: allTimeVouchers.length,
      paid: paidCount,
      partial: partialCount,
      unpaid: unpaidCount
    }
  };
};

/**
 * @route   GET /api/v1/erp/collections
 * @desc    Get total collections and financial statistics for external ERP integration
 * @access  Protected via ERP API Key
 */
const getCollections = asyncHandler(async (req, res) => {
  const { institution, startDate, endDate } = req.query;

  let instQuery = {};
  if (institution && mongoose.Types.ObjectId.isValid(institution)) {
    instQuery.institution = new mongoose.Types.ObjectId(institution);
  }

  // Calculate high level stats
  const collectionsData = await calculateERPCollectionStats(instQuery);

  // Today's collections
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Current month collections
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const paymentBaseMatch = { ...instQuery, status: 'completed' };

  if (startDate && endDate) {
    paymentBaseMatch.paymentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [todayAgg, monthAgg] = await Promise.all([
    FeePayment.aggregate([
      {
        $match: {
          ...instQuery,
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfToday, $lte: endOfToday } },
            { createdAt: { $gte: startOfToday, $lte: endOfToday } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FeePayment.aggregate([
      {
        $match: {
          ...instQuery,
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfMonth } },
            { createdAt: { $gte: startOfMonth } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const todayCollected = todayAgg[0]?.total || 0;
  const currentMonthCollected = monthAgg[0]?.total || 0;

  res.json({
    success: true,
    data: {
      currency: 'PKR',
      summary: {
        totalBilled: collectionsData.totalBilled,
        totalCollected: collectionsData.totalCollected,
        totalOutstanding: collectionsData.totalOutstanding,
        totalArrears: collectionsData.totalArrears,
        todayCollected,
        currentMonthCollected
      },
      vouchers: collectionsData.vouchers
    }
  });
});

/**
 * @route   GET /api/v1/erp/campus-breakdown
 * @desc    Get collection stats broken down per campus/institution for external ERP
 * @access  Protected via ERP API Key
 */
const getCampusBreakdown = asyncHandler(async (req, res) => {
  const institutions = await Institution.find({ isActive: true }).select('_id name code type');

  const campusBreakdown = await Promise.all(institutions.map(async (inst) => {
    const instId = inst._id;
    const [studentCount, stats] = await Promise.all([
      Student.countDocuments({ institution: instId, status: 'enrolled' }),
      calculateERPCollectionStats({ institution: instId })
    ]);

    return {
      institutionId: instId,
      name: inst.name,
      code: inst.code,
      type: inst.type,
      totalStudents: studentCount,
      totalBilled: stats.totalBilled,
      totalCollected: stats.totalCollected,
      totalOutstanding: stats.totalOutstanding,
      totalArrears: stats.totalArrears,
      vouchers: stats.vouchers
    };
  }));

  res.json({
    success: true,
    data: campusBreakdown
  });
});

/**
 * @route   GET /api/v1/erp/daily-collection
 * @desc    Get daily collection history over a specified period (for ERP charts)
 * @access  Protected via ERP API Key
 */
const getDailyCollection = asyncHandler(async (req, res) => {
  const { days = 30, startDate: startDateStr, endDate: endDateStr, institution } = req.query;

  let startDate, endDate;

  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
  }

  const matchQuery = {
    status: 'completed',
    $or: [
      { paymentDate: { $gte: startDate, $lte: endDate } },
      { createdAt: { $gte: startDate, $lte: endDate } }
    ]
  };

  if (institution && mongoose.Types.ObjectId.isValid(institution)) {
    matchQuery.institution = new mongoose.Types.ObjectId(institution);
  }

  const dailyTrend = await FeePayment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$paymentDate', '$createdAt'] },
            timezone: '+05:00'
          }
        },
        amount: { $sum: '$amount' },
        transactionsCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: dailyTrend.map(t => ({
      date: t._id,
      amount: t.amount,
      transactionsCount: t.transactionsCount
    }))
  });
});

/**
 * @route   GET /api/v1/erp/full-summary
 * @desc    Get complete unified ERP summary (Overview, Financials, Campus Breakdown, and Daily Trends) in a single API call
 * @access  Protected via ERP API Key
 */
const getFullSummary = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    institutions,
    totalStudents,
    activeStudents,
    struckOffStudents,
    newAdmissions,
    collectionsData,
    todayAgg,
    monthAgg,
    dailyTrend
  ] = await Promise.all([
    Institution.find({ isActive: true }).select('_id name code type'),
    Student.countDocuments({}),
    Student.countDocuments({ status: 'enrolled' }),
    Student.countDocuments({ status: 'struckoff' }),
    Student.countDocuments({ status: 'enrolled', admissionDate: { $gte: thirtyDaysAgo } }),
    calculateERPCollectionStats({}),
    FeePayment.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfToday, $lte: endOfToday } },
            { createdAt: { $gte: startOfToday, $lte: endOfToday } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FeePayment.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paymentDate: { $gte: startOfMonth } },
            { createdAt: { $gte: startOfMonth } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FeePayment.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { paymentDate: { $gte: thirtyDaysAgo } },
            { createdAt: { $gte: thirtyDaysAgo } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$paymentDate', '$createdAt'] },
              timezone: '+05:00'
            }
          },
          amount: { $sum: '$amount' },
          transactionsCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const campusBreakdown = await Promise.all(institutions.map(async (inst) => {
    const instId = inst._id;
    const [instStudentCount, instStats] = await Promise.all([
      Student.countDocuments({ institution: instId, status: 'enrolled' }),
      calculateERPCollectionStats({ institution: instId })
    ]);

    return {
      institutionId: instId,
      name: inst.name,
      code: inst.code,
      type: inst.type,
      totalStudents: instStudentCount,
      totalBilled: instStats.totalBilled,
      totalCollected: instStats.totalCollected,
      totalOutstanding: instStats.totalOutstanding,
      totalArrears: instStats.totalArrears,
      vouchers: instStats.vouchers
    };
  }));

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: {
      currency: 'PKR',
      overview: {
        totalCampuses: institutions.length,
        totalStudents,
        activeStudents,
        struckOffStudents,
        newAdmissionsLast30Days: newAdmissions
      },
      finance: {
        totalBilled: collectionsData.totalBilled,
        totalCollected: collectionsData.totalCollected,
        totalOutstanding: collectionsData.totalOutstanding,
        totalArrears: collectionsData.totalArrears,
        todayCollected: todayAgg[0]?.total || 0,
        currentMonthCollected: monthAgg[0]?.total || 0,
        vouchers: collectionsData.vouchers
      },
      campusBreakdown,
      dailyTrend: dailyTrend.map(t => ({
        date: t._id,
        amount: t.amount,
        transactionsCount: t.transactionsCount
      }))
    }
  });
});

module.exports = {
  getCollections,
  getCampusBreakdown,
  getDailyCollection,
  getFullSummary
};
