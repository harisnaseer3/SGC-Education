import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  MenuItem,
  Chip,
  Card,
  CardContent,
  TablePagination
} from '@mui/material';
import { Search, FileDownload, Print } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../../../config/api';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { 
  createAxiosConfig, 
  getInstitutionId, 
  exportToExcelWithBoldHeaders,
  formatMonthYear,
  parseMonthYear
} from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const DateRangeVouchersReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [filters, setFilters] = useState({
    filterMode: 'month', // default: 'month'
    monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    statusFilter: 'all', // 'all', 'paid', 'unpaid'
    classId: 'all',
    searchTerm: ''
  });

  // Summary counts
  const [summary, setSummary] = useState({
    totalCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalCurrentMonthAmount: 0,
    totalArrears: 0,
    totalVoucherAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchInstitution(parsedUser);
        fetchClasses(parsedUser);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }, []);

  const fetchInstitution = async (userData) => {
    try {
      const isSuperAdmin = userData?.role === 'super_admin';
      const institutionId = getInstitutionId(userData, isSuperAdmin);
      if (institutionId) {
        const response = await axios.get(`${API_URL}/institutions/${institutionId}`, createAxiosConfig());
        setInstitution(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching institution:', err);
    }
  };

  const fetchClasses = async (userData) => {
    try {
      const isSuperAdmin = userData?.role === 'super_admin';
      const institutionId = getInstitutionId(userData, isSuperAdmin);
      const params = { isActive: true };
      if (institutionId) params.institution = institutionId;
      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig({ params }));
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const normalizeVNo = (vNo) => {
    if (!vNo) return '';
    const s = vNo.toString().trim();
    return s.includes('-') ? s.split('-').pop() : s;
  };

  // Convert Date object/string to local YYYY-MM-DD
  const toLocalDateString = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFetchReport = async () => {
    if (filters.filterMode === 'dateRange') {
      if (!filters.startDate || !filters.endDate) {
        notifyError('Please select both Start Date and End Date');
        return;
      }
      if (filters.startDate > filters.endDate) {
        notifyError('Start Date cannot be greater than End Date');
        return;
      }
    } else {
      if (!filters.monthYear) {
        notifyError('Please select Fee Month & Year');
        return;
      }
    }

    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);

      const params = { institution: institutionId };
      const [feesRes, paymentsRes] = await Promise.all([
        axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params })),
        axios.get(`${API_URL}/fees/payments`, createAxiosConfig({ params: { institution: institutionId } }))
      ]);

      const allStudentFees = feesRes.data.data || [];
      const allPayments = paymentsRes.data.data || [];

      // 1. Group completed payments by voucher number & student
      const paymentsByVoucher = new Map();
      const paymentsByStudent = new Map();
      const completedPayments = allPayments.filter(p => p.status === 'completed' || p.status === 'success');

      completedPayments.forEach(p => {
        const vNo = normalizeVNo(p.voucherNumber);
        if (vNo) {
          if (!paymentsByVoucher.has(vNo)) paymentsByVoucher.set(vNo, []);
          paymentsByVoucher.get(vNo).push(p);
        }
        const sId = p.student?._id?.toString() || (typeof p.student === 'string' ? p.student : null);
        if (sId) {
          if (!paymentsByStudent.has(sId)) paymentsByStudent.set(sId, []);
          paymentsByStudent.get(sId).push(p);
        }
      });

      // 2. Group all student fees by student ID for calculating prior arrears
      const allFeesByStudent = new Map();
      allStudentFees.forEach(sf => {
        const sId = sf.student?._id?.toString() || (typeof sf.student === 'string' ? sf.student : null);
        if (sId) {
          if (!allFeesByStudent.has(sId)) allFeesByStudent.set(sId, []);
          allFeesByStudent.get(sId).push(sf);
        }
      });

      // 3. Extract unique vouchers across all student fee lines
      // Map key: `${studentId}__${voucherNo}__${month}__${year}`
      const voucherRecordsMap = new Map();

      allStudentFees.forEach(sf => {
        const student = sf.student;
        if (!student || !student._id) return;
        const studentId = student._id.toString();

        (sf.vouchers || []).forEach(v => {
          if (!v || v.month === undefined || v.year === undefined) return;
          const vMonth = Number(v.month);
          const vYear = Number(v.year);
          const rawVNo = v.voucherNumber || '';
          const shortVNo = normalizeVNo(rawVNo) || 'N/A';
          const key = `${studentId}__${shortVNo}__${vMonth}__${vYear}`;

          if (!voucherRecordsMap.has(key)) {
            voucherRecordsMap.set(key, {
              key,
              student,
              studentId,
              voucherNumber: shortVNo,
              rawVoucherNumber: rawVNo,
              month: vMonth,
              year: vYear,
              generatedAt: v.generatedAt ? new Date(v.generatedAt) : (sf.createdAt ? new Date(sf.createdAt) : null),
              dueDate: v.dueDate ? new Date(v.dueDate) : (sf.dueDate ? new Date(sf.dueDate) : null),
              feeLines: []
            });
          }
          const voucherGroup = voucherRecordsMap.get(key);
          voucherGroup.feeLines.push(sf);
          if (v.generatedAt && (!voucherGroup.generatedAt || new Date(v.generatedAt) < voucherGroup.generatedAt)) {
            voucherGroup.generatedAt = new Date(v.generatedAt);
          }
        });
      });

      const startDateFilter = filters.startDate;
      const endDateFilter = filters.endDate;
      const { month: targetMonth, year: targetYear } = parseMonthYear(filters.monthYear);

      const reportRows = [];

      voucherRecordsMap.forEach(vGroup => {
        const { student, studentId, voucherNumber, rawVoucherNumber, month, year, generatedAt, dueDate, feeLines } = vGroup;

        // Check inclusion filter:
        // In dateRange mode: voucher generatedAt between startDate and endDate
        // In month mode: voucher month === targetMonth and year === targetYear
        let includeInReport = false;
        if (filters.filterMode === 'dateRange') {
          const generatedDayStr = toLocalDateString(generatedAt);
          includeInReport = generatedDayStr && (generatedDayStr >= startDateFilter && generatedDayStr <= endDateFilter);
        } else {
          includeInReport = Number(month) === Number(targetMonth) && Number(year) === Number(targetYear);
        }

        if (!includeInReport) return;

        // 1. Current Month Amount (excluding arrears fee head)
        let currentMonthAmount = 0;
        feeLines.forEach(sf => {
          if (sf.feeHead?.name?.toLowerCase() !== 'arrears') {
            currentMonthAmount += parseFloat(sf.finalAmount || 0);
          }
        });

        // 2. Arrears Calculation (Matches Print Voucher & Remaining Balance logic)
        const studentAllFees = allFeesByStudent.get(studentId) || [];
        let totalBilledPrev = 0;
        let totalPaidPrev = 0;

        studentAllFees.forEach(f => {
          const hasV = f.vouchers && f.vouchers.length > 0;
          let isPrior = false;
          if (hasV) {
            isPrior = f.vouchers.every(v => (Number(v.year) < year) || (Number(v.year) === year && Number(v.month) < month));
          }
          if (isPrior) {
            if (f.feeHead?.name?.toLowerCase() !== 'arrears') {
              totalBilledPrev += parseFloat(f.finalAmount || 0);
            }
            totalPaidPrev += parseFloat(f.paidAmount || 0);
          }
        });

        const outstandingPrevArrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);

        // Payments specifically for this voucher number
        const voucherPayments = voucherNumber !== 'N/A' ? (paymentsByVoucher.get(voucherNumber) || []) : [];
        const feeLineIds = new Set(feeLines.map(f => f._id?.toString()));

        // Paid Arrears via voucher number: payments recorded against older fee lines under this voucher number
        const paidArrearsViaVoucherNumber = voucherPayments.reduce((sum, p) => {
          const sfId = p.studentFee?._id?.toString() || p.studentFee?.toString();
          const isCurrentFee = feeLines.some(f => f._id?.toString() === sfId && f.feeHead?.name?.toLowerCase() !== 'arrears');
          if (!isCurrentFee) {
            return sum + parseFloat(p.amount || 0);
          }
          return sum;
        }, 0);

        // Payment directly on the Arrears fee head
        const arrearsRecordOnVoucher = feeLines.find(sf => sf.feeHead?.name?.toLowerCase() === 'arrears');
        const arrearsPaymentsOnVoucher = arrearsRecordOnVoucher ? parseFloat(arrearsRecordOnVoucher.paidAmount || 0) : 0;
        const paidArrearsOnThisVoucher = Math.max(paidArrearsViaVoucherNumber, arrearsPaymentsOnVoucher);

        // Prefer stored snapshot on voucher if available, else ledger balance + paidArrears
        let previousBalance = 0;
        if (arrearsRecordOnVoucher && parseFloat(arrearsRecordOnVoucher.finalAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsRecordOnVoucher.finalAmount || 0);
        } else if (arrearsRecordOnVoucher && parseFloat(arrearsRecordOnVoucher.baseAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsRecordOnVoucher.baseAmount || 0);
        } else {
          previousBalance = Math.max(0, Math.round((outstandingPrevArrears + paidArrearsOnThisVoucher) * 100) / 100);
        }

        // Regular fees paid on current month lines (excluding arrears head)
        const regularPaid = feeLines.reduce((sum, f) => {
          if (f.feeHead?.name?.toLowerCase() === 'arrears') return sum;
          return sum + parseFloat(f.paidAmount || 0);
        }, 0);

        // Total Paid on this voucher = regular paid + arrears paid under this voucher
        const totalPaidForVoucher = regularPaid + paidArrearsOnThisVoucher;
        const totalVoucherObligation = currentMonthAmount + previousBalance;
        const remainingAmount = Math.max(0, Math.round((totalVoucherObligation - totalPaidForVoucher) * 100) / 100);

        // Determine Status
        let status = 'Unpaid';
        if (remainingAmount <= 0.01 && (totalPaidForVoucher > 0 || totalVoucherObligation === 0)) {
          status = 'Paid';
        } else if (totalPaidForVoucher > 0) {
          status = 'Partial';
        }

        // Latest Payment Date, Bank, & Transaction ID
        let latestPaymentDate = null;
        let paymentBanks = [];
        let transactionIds = [];

        if (voucherPayments.length > 0) {
          const sorted = [...voucherPayments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
          latestPaymentDate = sorted[0].paymentDate ? new Date(sorted[0].paymentDate) : null;
          paymentBanks = Array.from(new Set(sorted.map(p => p.bankName).filter(Boolean)));
          transactionIds = Array.from(new Set(sorted.map(p => p.transactionId).filter(Boolean)));
        }

        const admission = student.admission || {};
        const className = student.class?.name || student.className || admission.class?.name || 'N/A';
        const classId = student.class?._id?.toString() || (typeof student.class === 'string' ? student.class : '') || admission.class?._id?.toString() || '';
        const studentName = student.name || student.personalDetails?.name || admission.personalInfo?.name || 'N/A';
        const fatherName = student.guardianInfo?.fatherName || admission.guardianInfo?.fatherName || student.fatherName || 'N/A';
        const rollNo = student.rollNumber || admission.rollNumber || 'N/A';
        const admNo = student.enrollmentNumber || student.applicationNumber || admission.applicationNumber || 'N/A';

        reportRows.push({
          id: vGroup.key,
          voucherNumber,
          rawVoucherNumber,
          feeMonth: formatMonthYear(month, year),
          month,
          year,
          generatedDate: generatedAt,
          dueDate,
          paymentDate: latestPaymentDate,
          studentId,
          studentName,
          fatherName,
          rollNo,
          admNo,
          className,
          classId,
          currentMonthAmount,
          arrears: previousBalance,
          totalDue: totalVoucherObligation,
          paidAmount: totalPaidForVoucher,
          remainingAmount,
          status,
          bank: paymentBanks.join(', ') || '-',
          transactionId: transactionIds.join(', ') || '-'
        });
      });

      // Sort report rows: by generatedDate descending, then voucherNumber
      reportRows.sort((a, b) => {
        const dateA = a.generatedDate ? new Date(a.generatedDate).getTime() : 0;
        const dateB = b.generatedDate ? new Date(b.generatedDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (parseInt(a.voucherNumber) || 0) - (parseInt(b.voucherNumber) || 0);
      });

      setData(reportRows);
      notifySuccess(`Generated report with ${reportRows.length} vouchers`);
    } catch (err) {
      console.error('Error generating Vouchers Report:', err);
      notifyError(err.response?.data?.message || 'Failed to generate report');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data in UI (Class, Status, Search)
  useEffect(() => {
    let result = [...data];

    if (filters.statusFilter !== 'all') {
      result = result.filter(item => {
        if (filters.statusFilter === 'paid') return item.status === 'Paid';
        if (filters.statusFilter === 'unpaid') return item.status === 'Unpaid' || item.status === 'Partial';
        return true;
      });
    }

    if (filters.classId !== 'all') {
      result = result.filter(item => item.classId === filters.classId || item.className.toLowerCase() === (classes.find(c => c._id === filters.classId)?.name || '').toLowerCase());
    }

    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const q = filters.searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.voucherNumber && item.voucherNumber.toLowerCase().includes(q)) ||
        (item.studentName && item.studentName.toLowerCase().includes(q)) ||
        (item.fatherName && item.fatherName.toLowerCase().includes(q)) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(q)) ||
        (item.admNo && item.admNo.toLowerCase().includes(q)) ||
        (item.className && item.className.toLowerCase().includes(q)) ||
        (item.transactionId && item.transactionId.toLowerCase().includes(q))
      );
    }

    setFilteredData(result);
    setPage(0);

    // Calculate Grand Totals across all filtered items
    const paidItems = result.filter(r => r.status === 'Paid');
    const unpaidItems = result.filter(r => r.status === 'Unpaid' || r.status === 'Partial');
    const totalCurrentMonthAmount = result.reduce((s, r) => s + (r.currentMonthAmount || 0), 0);
    const totalArrears = result.reduce((s, r) => s + (r.arrears || 0), 0);
    const totalVoucherAmount = result.reduce((s, r) => s + (r.totalDue || 0), 0);
    const totalPaidAmount = result.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const totalRemainingAmount = result.reduce((s, r) => s + (r.remainingAmount || 0), 0);

    setSummary({
      totalCount: result.length,
      paidCount: paidItems.length,
      unpaidCount: unpaidItems.length,
      totalCurrentMonthAmount,
      totalArrears,
      totalVoucherAmount,
      totalPaidAmount,
      totalRemainingAmount
    });
  }, [data, filters.statusFilter, filters.classId, filters.searchTerm, classes]);

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

    const exportRows = filteredData.map(item => ({
      'Voucher #': item.voucherNumber || 'N/A',
      'Student Name': item.studentName,
      'Father Name': item.fatherName,
      'Class': item.className,
      'Roll No': item.rollNo,
      'Adm #': item.admNo,
      'Fee Month': item.feeMonth,
      'Voucher Generated Date': formatDate(item.generatedDate),
      'Payment Date': formatDate(item.paymentDate),
      'Current Month Fee': item.currentMonthAmount,
      'Arrears': item.arrears,
      'Total Due': item.totalDue,
      'Paid Amount': item.paidAmount,
      'Remaining Balance': item.remainingAmount,
      'Status': item.status,
      'Bank': item.bank,
      'FT # / TID': item.transactionId
    }));

    // Add empty row
    exportRows.push({});

    // Add Grand Total row
    exportRows.push({
      'Voucher #': 'GRAND TOTAL',
      'Student Name': '',
      'Father Name': '',
      'Class': '',
      'Roll No': '',
      'Adm #': '',
      'Fee Month': '',
      'Voucher Generated Date': '',
      'Payment Date': '',
      'Current Month Fee': summary.totalCurrentMonthAmount,
      'Arrears': summary.totalArrears,
      'Total Due': summary.totalVoucherAmount,
      'Paid Amount': summary.totalPaidAmount,
      'Remaining Balance': summary.totalRemainingAmount,
      'Status': '',
      'Bank': '',
      'FT # / TID': ''
    });

    const titleSuffix = filters.filterMode === 'dateRange' 
      ? `${filters.startDate}_to_${filters.endDate}`
      : filters.monthYear;

    exportToExcelWithBoldHeaders(
      XLSX,
      exportRows,
      'Vouchers Report',
      `Vouchers_Report_${titleSuffix}.xlsx`,
      {
        'Filter Mode': filters.filterMode === 'dateRange' ? 'Date Range' : 'Fee Month',
        'Filter Criteria': filters.filterMode === 'dateRange' ? `${filters.startDate} to ${filters.endDate}` : filters.monthYear,
        'Institution': institution?.name || 'SGC Education'
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #report-print-area, #report-print-area * { visibility: visible; }
            #report-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print { display: none !important; }
            @page { size: landscape; margin: 8mm; }
            table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt !important; }
            th, td { border: 1px solid #ddd !important; padding: 4px !important; }
          }
        `}
      </style>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#2c3e50', mb: 1 }}>
          Vouchers Report Filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          View all vouchers generated in a specific <b>Date Range</b> or <b>Fee Month</b> with exact arrears, paid amount, and remaining balance.
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              select
              label="Filter By"
              value={filters.filterMode}
              onChange={(e) => setFilters({ ...filters, filterMode: e.target.value })}
            >
              <MenuItem value="dateRange">Date Range</MenuItem>
              <MenuItem value="month">Fee Month</MenuItem>
            </TextField>
          </Grid>

          {filters.filterMode === 'dateRange' ? (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          ) : (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                type="month"
                label="Fee Month & Year"
                value={filters.monthYear}
                onChange={(e) => setFilters({ ...filters, monthYear: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              select
              label="Class"
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            >
              <MenuItem value="all">All Classes</MenuItem>
              {classes.map(cls => (
                <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              select
              label="Status"
              value={filters.statusFilter}
              onChange={(e) => setFilters({ ...filters, statusFilter: e.target.value })}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="paid">Paid Vouchers</MenuItem>
              <MenuItem value="unpaid">Unpaid / Partial</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
              onClick={handleFetchReport}
              disabled={loading}
              sx={{ bgcolor: '#667eea', height: '40px', fontWeight: 600, '&:hover': { bgcolor: '#5a6fd6' } }}
            >
              Generate
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search Student, Roll #, Voucher #, FT #..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary KPI Cards with Grand Totals */}
      {data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
          <Grid item xs={6} sm={4} md={1.5}>
            <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Total Vouchers</Typography>
                <Typography variant="h6" fontWeight="bold">{summary.totalCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.5}>
            <Card sx={{ bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#047857">Paid ({summary.paidCount})</Typography>
                <Typography variant="body1" fontWeight="bold" color="#065f46">
                  {summary.totalPaidAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.8}>
            <Card sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#1d4ed8">Current Fee (Rs.)</Typography>
                <Typography variant="body1" fontWeight="bold" color="#1e40af">
                  {summary.totalCurrentMonthAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.8}>
            <Card sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#b45309">Arrears (Rs.)</Typography>
                <Typography variant="body1" fontWeight="bold" color="#92400e">
                  {summary.totalArrears.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.8}>
            <Card sx={{ bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#6d28d9">Total Due (Rs.)</Typography>
                <Typography variant="body1" fontWeight="bold" color="#5b21b6">
                  {summary.totalVoucherAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.8}>
            <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#15803d">Total Paid (Rs.)</Typography>
                <Typography variant="body1" fontWeight="bold" color="#166534">
                  {summary.totalPaidAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={1.8}>
            <Card sx={{ bgcolor: '#fff1f2', border: '1px solid #fecdd3' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="#be123c">Total Balance (Rs.)</Typography>
                <Typography variant="body1" fontWeight="bold" color="#9f1239">
                  {summary.totalRemainingAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Report Table */}
      {filteredData.length > 0 ? (
        <Box id="report-print-area">
          <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
              Showing {filteredData.length} records
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExportExcel}
                color="success"
              >
                Export Excel
              </Button>
            </Box>
          </Box>

          {/* Print-only Header */}
          <Box sx={{ display: 'none', '@media print': { display: 'block' }, textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              {institution?.name || 'SGC Education System'}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              Vouchers Report - {filters.filterMode === 'dateRange' ? `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}` : filters.monthYear}
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Voucher #</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fee Month</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Generated Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Payment Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cur. Fee</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Arrears</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Due</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Bank / FT #</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                  <TableRow key={row.id || idx} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.voucherNumber}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600">{row.studentName}</Typography>
                      <Typography variant="caption" color="textSecondary">{row.rollNo ? `Roll: ${row.rollNo}` : (row.admNo ? `Adm: ${row.admNo}` : '')}</Typography>
                    </TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.feeMonth}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(row.generatedDate)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(row.paymentDate)}</Typography>
                    </TableCell>
                    <TableCell align="right">{row.currentMonthAmount ? row.currentMonthAmount.toLocaleString() : '0'}</TableCell>
                    <TableCell align="right">{row.arrears ? row.arrears.toLocaleString() : '0'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{row.totalDue.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: row.paidAmount > 0 ? '#16a34a' : 'inherit' }}>
                      {row.paidAmount ? row.paidAmount.toLocaleString() : '0'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: row.remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                      {row.remainingAmount ? row.remainingAmount.toLocaleString() : '0'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={row.status}
                        color={row.status === 'Paid' ? 'success' : (row.status === 'Partial' ? 'warning' : 'error')}
                        sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.bank !== '-' ? row.bank : ''}</Typography>
                      <Typography variant="caption" color="textSecondary">{row.transactionId !== '-' ? row.transactionId : ''}</Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Grand Total Summary Row */}
                <TableRow sx={{ bgcolor: '#f1f5f9', borderTop: '2px solid #000' }}>
                  <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>
                    GRAND TOTAL:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e40af' }}>
                    {summary.totalCurrentMonthAmount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#92400e' }}>
                    {summary.totalArrears.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#5b21b6' }}>
                    {summary.totalVoucherAmount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#166534' }}>
                    {summary.totalPaidAmount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#dc2626' }}>
                    {summary.totalRemainingAmount.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100, 250]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            className="no-print"
          />
        </Box>
      ) : (
        !loading && (
          <Alert severity="info" sx={{ mt: 2 }} className="no-print">
            No vouchers match the criteria for the selected filter.
          </Alert>
        )
      )}
    </Box>
  );
};

export default DateRangeVouchersReport;
