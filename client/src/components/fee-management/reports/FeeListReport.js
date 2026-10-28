import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Checkbox,
  FormControlLabel,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import {
  Print,
  FileDownload,
  FilterList,
  Search,
  ArrowBack
} from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  getInstitutionId, 
  createAxiosConfig, 
  parseMonthYear, 
  formatCurrency, 
  formatMonthYear,
  exportToExcelWithBoldHeaders
} from '../../../utils/feeUtils';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { notifyError, notifySuccess } from '../../../utils/notify';

const API_URL = getApiBaseUrl();

const FeeListReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [user, setUser] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [availableStatuses, setAvailableStatuses] = useState([
    'Enrolled', 'Soft Admission', 'Struck Off', 'Expelled', 'Freeze', 'School Leaving'
  ]);
  
  const [filters, setFilters] = useState({
    className: 'All',
    statuses: ['Enrolled'],
    monthYear: new Date().toISOString().slice(0, 7), // YYYY-MM
    includePreviousBalance: true,
    includeDefaultersWithoutVoucher: false
  });

  const [reportData, setReportData] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalRemaining: 0,
    totalDue: 0
  });

  const printRef = useRef();
  const fetchClassesRef = useRef(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    let parsedUser = null;
    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
    const isSuperAdmin = parsedUser?.role === 'super_admin';
    const institutionId = getInstitutionId(parsedUser, isSuperAdmin);
    if (institutionId) {
      fetchInstitution(parsedUser, institutionId);
      fetchClasses(institutionId);
    } else {
      fetchClasses();
    }

    const handleInstChange = () => {
      const u = localStorage.getItem('user');
      const pUser = u ? JSON.parse(u) : parsedUser;
      const id = getInstitutionId(pUser, pUser?.role === 'super_admin');
      if (id) {
        fetchInstitution(pUser, id);
        fetchClasses(id);
      }
    };

    window.addEventListener('institutionChanged', handleInstChange);
    window.addEventListener('storage', handleInstChange);
    return () => {
      window.removeEventListener('institutionChanged', handleInstChange);
      window.removeEventListener('storage', handleInstChange);
    };
  }, []);

  const fetchInstitution = async (userData, instId) => {
    try {
      const isSuperAdmin = userData?.role === 'super_admin';
      const institutionId = instId || getInstitutionId(userData, isSuperAdmin);
      if (institutionId) {
        const response = await axios.get(`${API_URL}/institutions/${institutionId}`, createAxiosConfig());
        setInstitution(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching institution:', err);
    }
  };

  const fetchClasses = async (instId) => {
    try {
      const activeUser = user || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
      const isSuperAdmin = activeUser?.role === 'super_admin';
      const institutionId = instId || getInstitutionId(activeUser, isSuperAdmin);
      const params = { isActive: true };
      if (institutionId) {
        params.institution = institutionId;
      }
      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig({ params }));
      const rawClasses = response.data.data || [];
      
      // Unique-ify classes by name to avoid duplicates in dropdown
      const uniqueMap = new Map();
      rawClasses.forEach(c => {
        if (c.name && !uniqueMap.has(c.name)) {
          uniqueMap.set(c.name, c);
        }
      });
      setClasses(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching classes:', err);
      notifyError('Failed to fetch classes');
    }
  };

  const handleClassChange = (e) => {
    const className = e.target.value;
    setFilters(prev => ({ ...prev, className }));
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleFetchReport = async () => {
    // If className is not 'All' and is empty, notify user
    if (!filters.className && filters.className !== 'All') {
      notifyError('Please select a class');
      return;
    }

    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);
      const { month, year } = parseMonthYear(filters.monthYear);

      // 1. Fetch all student fees AND all payments (same as Print Voucher) so
      //    received/remaining match exactly between the two views.
      const params = {
        institution: institutionId,
      };

      const [response, paymentsResponse] = await Promise.all([
        axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params })),
        axios.get(`${API_URL}/fees/payments`, createAxiosConfig({ params: { institution: institutionId } }))
      ]);
      const allStudentFees = response.data.data || [];
      const allPayments = paymentsResponse.data.data || [];

      // Build paymentsByVoucher map (same logic as Print Voucher)
      const normalizeVNo = (vNo) => {
        if (!vNo) return null;
        const s = vNo.toString().trim();
        return s.includes('-') ? s.split('-').pop() : s;
      };
      const paymentsByVoucher = new Map();
      allPayments.forEach(p => {
        if (p.status !== 'completed' && p.status !== 'success') return;
        const vNo = normalizeVNo(p.voucherNumber);
        if (!vNo) return;
        if (!paymentsByVoucher.has(vNo)) paymentsByVoucher.set(vNo, []);
        paymentsByVoucher.get(vNo).push(p);
      });

      const targetMonth = Number(month);
      const targetYear = Number(year);

      // 1. Group all fees by student ID regardless of filters to preserve complete history across classes/sessions
      const allFeesByStudent = new Map();
      allStudentFees.forEach(sf => {
        const sId = sf.student?._id?.toString();
        if (!sId) return;
        if (!allFeesByStudent.has(sId)) allFeesByStudent.set(sId, []);
        allFeesByStudent.get(sId).push(sf);
      });

      // 2. Build unique students map applying class and status filters
      const studentMap = new Map();
      allStudentFees.forEach(sf => {
        const student = sf.student;
        if (!student || !student._id) return;
        const studentId = student._id.toString();

        const admission = student.admission || {};

        // Match Class Name (skip if 'All')
        if (filters.className !== 'All') {
          const sClassName = student.class?.name || student.className || admission.class?.name || student.currentClass?.name || student.currentClass || sf.class?.name || '';
          const matchClass = sClassName.toString().toLowerCase() === filters.className.toLowerCase();
          if (!matchClass) return;
        }

        const rawStatus = (student.status || admission.status || '').toLowerCase().trim();
        const isStruckOffRaw = rawStatus === 'struck off' || rawStatus === 'struck_off' || rawStatus === 'struckoff';

        let isEffectiveStruckOff = false;
        if (isStruckOffRaw) {
          const studentAllFees = allFeesByStudent.get(studentId) || [];
          const hasCurrentMonthVoucher = studentAllFees.some(f => 
            (f.vouchers || []).some(v => Number(v.month) === targetMonth && Number(v.year) === targetYear)
          );

          // Find date when student was struck off from statusHistory or updatedAt
          let struckOffDate = null;
          if (student.statusHistory && Array.isArray(student.statusHistory)) {
            const struckEntry = [...student.statusHistory]
              .reverse()
              .find(h => (h.status === 'struck_off' || h.status === 'struckoff' || h.status === 'struck off') && h.changedAt);
            if (struckEntry) struckOffDate = new Date(struckEntry.changedAt);
          }
          if (!struckOffDate && admission?.statusHistory && Array.isArray(admission.statusHistory)) {
            const struckEntry = [...admission.statusHistory]
              .reverse()
              .find(h => (h.status === 'struck_off' || h.status === 'struckoff' || h.status === 'struck off') && h.changedAt);
            if (struckEntry) struckOffDate = new Date(struckEntry.changedAt);
          }
          if (!struckOffDate && (student.updatedAt || admission?.updatedAt)) {
            struckOffDate = new Date(student.updatedAt || admission.updatedAt);
          }

          const targetMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

          if (struckOffDate) {
            // Student is only considered struck off for this report if the struck-off date was on or before this month's end
            isEffectiveStruckOff = struckOffDate <= targetMonthEnd;
          } else {
            // If no struck-off date is recorded, fallback: if they have a voucher for this month, they were still active; otherwise struck off
            isEffectiveStruckOff = !hasCurrentMonthVoucher;
          }
        }

        // Match Status (skip if it contains 'All' or is empty)
        // EXCEPTION: if the student already has a voucher for the target month, always include them
        // (matches Print Voucher which shows all students with vouchers regardless of status).
        const studentAllFeesForStatus = allFeesByStudent.get(studentId) || [];
        const hasCurrentMonthVoucherForStatus = studentAllFeesForStatus.some(f =>
          (f.vouchers || []).some(v => Number(v.month) === targetMonth && Number(v.year) === targetYear)
        );
        if (!hasCurrentMonthVoucherForStatus) {
          if (filters.statuses.length > 0 && !filters.statuses.includes('All')) {
            const effectiveStatus = isEffectiveStruckOff ? 'Struck Off' : (student.status || admission.status || 'Enrolled');
            const matchStatus = filters.statuses.some(s => {
              const sLower = s.toLowerCase().trim();
              if (sLower === 'struck off' || sLower === 'struck_off' || sLower === 'struckoff') {
                return isEffectiveStruckOff || isStruckOffRaw;
              }
              return sLower === effectiveStatus.toLowerCase() || 
                     sLower === (student.status || admission.status || '').toLowerCase();
            });
            if (!matchStatus) return;
          }
        }

        // Keep the most populated student object
        if (!studentMap.has(studentId) || (typeof sf.student === 'object' && sf.student?.admission)) {
          studentMap.set(studentId, sf.student);
        }
      });

      // 3. Process each student matching Remaining Balance report logic
      const studentsGroup = new Map();
      const headsSet = new Set();
      if (filters.includePreviousBalance) {
        headsSet.add('Arrears');
      }

      studentMap.forEach((studentObj, studentId) => {
        const studentAllFees = allFeesByStudent.get(studentId) || [];

        // Check relevant vouchers up to target month/year
        const relevantVouchers = studentAllFees.filter(sf => 
          (sf.vouchers || []).some(v => {
            const vMonth = Number(v.month);
            const vYear = Number(v.year);
            return vYear < targetYear || (vYear === targetYear && vMonth <= targetMonth);
          })
        );
        if (relevantVouchers.length === 0) return;

        // Fees belonging to the selected month/year
        const currentMonthFees = studentAllFees.filter(sf => 
          (sf.vouchers || []).some(v => Number(v.month) === targetMonth && Number(v.year) === targetYear)
        );

        // Previous fees calculation (all periods before target month/year)
        let totalBilledPrev = 0;
        let totalPaidPrev = 0;

        studentAllFees.forEach(f => {
          const hasVouchers = f.vouchers && f.vouchers.length > 0;
          let isPrevious = false;
          if (hasVouchers) {
            isPrevious = f.vouchers.every(v => 
              (Number(v.year) < targetYear) || 
              (Number(v.year) === targetYear && Number(v.month) < targetMonth)
            );
          }
          if (isPrevious) {
            if (f.feeHead?.name?.toLowerCase() !== 'arrears') {
              totalBilledPrev += parseFloat(f.finalAmount || 0);
            }
            totalPaidPrev += parseFloat(f.paidAmount || 0);
          }
        });

        const outstandingPrev = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);

        // If no fee in current month:
        // By default, match Print Voucher and only show students with a current month voucher.
        // Only include students without a current month voucher if includeDefaultersWithoutVoucher is enabled.
        if (currentMonthFees.length === 0) {
          if (!filters.includeDefaultersWithoutVoucher) return;
          if (outstandingPrev <= 0) return;
        }

        const arrearsFee = currentMonthFees.find(sf => sf.feeHead?.name?.toLowerCase() === 'arrears');
        const regularFees = currentMonthFees.filter(sf => sf.feeHead?.name?.toLowerCase() !== 'arrears');

        const arrearsPaymentsOnVoucher = arrearsFee ? parseFloat(arrearsFee.paidAmount || 0) : 0;

        // Previous Balance (P.Bal):
        // ALWAYS prefer the arrears snapshot billed on this voucher so arrears stay attributed to their
        // billed month even after the voucher is paid. Fall back to live ledger only when no snapshot exists.
        let previousBalance = 0;
        if (arrearsFee && parseFloat(arrearsFee.finalAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsFee.finalAmount || 0);
        } else if (arrearsFee && parseFloat(arrearsFee.baseAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsFee.baseAmount || 0);
        } else {
          // No snapshot: use live ledger. Add back any arrears already collected through this voucher
          // so the displayed arrears remain stable regardless of payment state.
          previousBalance = Math.max(0, Math.round((outstandingPrev + arrearsPaymentsOnVoucher) * 100) / 100);
        }

        // Compute paidArrearsOnThisVoucher using the same voucher-number-based approach as
        // Print Voucher so that totalReceived matches exactly.
        // This captures payments made against OLD fee records using the current month's voucher number.
        let currentVoucherNo = null;
        for (const sf of currentMonthFees) {
          const v = (sf.vouchers || []).find(x => x && Number(x.month) === targetMonth && Number(x.year) === targetYear && x.voucherNumber);
          if (v) { currentVoucherNo = normalizeVNo(v.voucherNumber); break; }
        }

        const regularFeeIds = new Set(regularFees.map(f => f._id?.toString()));
        let paidArrearsViaVoucherNumber = 0;
        if (currentVoucherNo) {
          paidArrearsViaVoucherNumber = (paymentsByVoucher.get(currentVoucherNo) || []).reduce((sum, p) => {
            const sfId = p.studentFee?._id?.toString() || p.studentFee?.toString();
            // Count payment if it is NOT against a current-month regular fee
            return regularFeeIds.has(sfId) ? sum : sum + parseFloat(p.amount || 0);
          }, 0);
        }
        // Use the higher of voucher-number-based or arrears-head paidAmount (same as Print Voucher)
        const paidArrearsOnThisVoucher = Math.max(paidArrearsViaVoucherNumber, arrearsPaymentsOnVoucher);

        const monthlyFees = regularFees.reduce((sum, sf) => sum + parseFloat(sf.finalAmount || 0), 0);
        const currentReceived = regularFees.reduce((sum, sf) => sum + parseFloat(sf.paidAmount || 0), 0);
        // totalReceived now matches Print Voucher: regular paid + arrears paid via this voucher
        const totalReceived = currentReceived + paidArrearsOnThisVoucher;

        const effectiveArrears = filters.includePreviousBalance ? previousBalance : 0;
        const totalDue = monthlyFees + effectiveArrears;
        const totalRemaining = Math.max(0, totalDue - totalReceived);

        // Populate headwise
        const headwise = {};
        if (filters.includePreviousBalance) {
          headwise['Arrears'] = effectiveArrears;
        }

        regularFees.forEach(sf => {
          const headName = sf.feeHead?.name || 'Other';
          headwise[headName] = (headwise[headName] || 0) + parseFloat(sf.finalAmount || 0);
          headsSet.add(headName);
        });

        const admission = studentObj.admission || {};
        const className = studentObj.class?.name || studentObj.className || admission.class?.name || studentObj.currentClass?.name || studentObj.currentClass || (monthlyFees[0] && monthlyFees[0].class?.name) || 'Unassigned';

        studentsGroup.set(studentId, {
          student: studentObj,
          displayClassName: className,
          monthlyFees,
          totalDue,
          totalReceived,
          totalRemaining,
          headwise
        });
      });

      // Convert Map to array and enrich with className for grouping
      const finalData = Array.from(studentsGroup.values()).sort((a, b) => {
        // Primary sort: Class Name
        const classComp = a.displayClassName.localeCompare(b.displayClassName);
        if (classComp !== 0) return classComp;
        
        // Secondary sort: Student Name
        const nameA = a.student?.user?.name || a.student?.admission?.personalInfo?.name || '';
        const nameB = b.student?.user?.name || b.student?.admission?.personalInfo?.name || '';
        return nameA.localeCompare(nameB);
      });

      // Extract unique fee head names for columns
      const sortedHeads = Array.from(headsSet).sort((a, b) => {
        if (a === 'Arrears') return -1;
        if (b === 'Arrears') return 1;
        return a.localeCompare(b);
      });

      setReportData(finalData);
      setFeeHeads(sortedHeads);

      // Calculate overall summary
      const totals = finalData.reduce((acc, curr) => ({
        totalReceived: acc.totalReceived + curr.totalReceived,
        totalRemaining: acc.totalRemaining + curr.totalRemaining,
        totalDue: acc.totalDue + curr.totalDue
      }), { totalReceived: 0, totalRemaining: 0, totalDue: 0 });

      setSummary(totals);
      setLoading(false);
      notifySuccess(`Found ${finalData.length} students`);

    } catch (err) {
      console.error('Error fetching report:', err);
      notifyError('Failed to fetch report data');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const exportData = reportData.map((item, index) => {
      const row = {
        'Sr#': index + 1,
        'Std. ID': item.student?.enrollmentNumber || 'N/A',
        'Roll#': item.student?.rollNumber || 'N/A',
        'Adm#': item.student?.applicationNumber || item.student?.admissionNo || item.student?.admissionNumber || item.student?.admission?.applicationNumber || 'N/A',
        'Student Name': item.student?.personalDetails?.name || item.student?.name || item.student?.user?.name || item.student?.admission?.personalInfo?.name || 'N/A',
        'Class': item.displayClassName || 'N/A',
        'Section': item.student?.section?.name || item.student?.admission?.section?.name || 'N/A',
        'Father Name': item.student?.guardianInfo?.fatherName || item.student?.admission?.guardianInfo?.fatherName || 'N/A',
        'Monthly Fee': item.monthlyFees,
        'Total Received': item.totalReceived,
        'Total Remaining': item.totalRemaining,
        'Pre Months Fine Received': 0, // Placeholder
        'Total Due': item.totalDue,
      };

      // Add headwise detail
      feeHeads.forEach(head => {
        row[head] = item.headwise[head] || 0;
      });

      return row;
    });

    exportToExcelWithBoldHeaders(
      XLSX, 
      exportData, 
      'Fee List', 
      `FeeList_${filters.monthYear}.xlsx`,
      {
        'Month': formatMonthYear(...Object.values(parseMonthYear(filters.monthYear))),
        'Class': filters.className === 'All' ? 'All Classes' : filters.className,
        'Status': filters.statuses.join(', ')
      }
    );
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              size="small"
              label="Class"
              value={filters.className}
              onChange={handleClassChange}
              InputLabelProps={{
                shrink: true
              }}
              SelectProps={{
                displayEmpty: true
              }}
            >
              <MenuItem value="All">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls._id} value={cls.name}>{cls.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete
              multiple
              size="small"
              options={['All', ...availableStatuses]}
              value={filters.statuses}
              onChange={(e, newValue) => {
                if (newValue.includes('All')) {
                  handleFilterChange('statuses', ['All']);
                } else {
                  handleFilterChange('statuses', newValue);
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Student Status" placeholder="Status" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                ))
              }
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              type="month"
              label="Month & Year"
              value={filters.monthYear}
              onChange={(e) => handleFilterChange('monthYear', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={filters.includePreviousBalance}
                  onChange={(e) => handleFilterChange('includePreviousBalance', e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                  Include Prev Bal (Arrears)
                </Typography>
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={filters.includeDefaultersWithoutVoucher}
                  onChange={(e) => handleFilterChange('includeDefaultersWithoutVoucher', e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                  Include Defaulters (No Current Voucher)
                </Typography>
              }
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
              onClick={handleFetchReport}
              disabled={loading}
              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Content */}
      {reportData.length > 0 ? (
        <Paper ref={printRef} sx={{ p: 4, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          {/* Print Styles */}
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  padding: 10px;
                }
                .no-print { display: none !important; }
                @page { size: landscape; margin: 10mm; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 4px; font-size: 8pt; }
                .header-info { margin-bottom: 20px; }
              }
            `}
          </style>

          <Box className="print-area">
            {/* Action Buttons (Hidden on Print) */}
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                sx={{ color: '#667eea', borderColor: '#667eea' }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExportExcel}
                sx={{ bgcolor: '#48bb78', '&:hover': { bgcolor: '#38a169' } }}
              >
                Export Excel
              </Button>
            </Box>

            {/* Print Header */}
            <Box className="header-info" sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 0 }}>
                  {institution?.logo ? (
                    <Box
                      component="img"
                      src={getLogoUrl(institution.logo, institution._id)}
                      sx={{ height: '80px', width: '80px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img src="/logo192.png" alt="Logo" style={{ height: '80px' }} onError={(e) => e.target.style.display='none'} />
                  )}
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: 1 }}>
                    {institution?.name || 'SGC Education System'}
                  </Typography>
                  <Typography variant="h6">{institution?.address?.city || ''}</Typography>
                  <Typography variant="body1" fontWeight="bold" color="text.secondary">
                    Fee List Report
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mt: 2, border: '1px solid #eee', p: 1, bgcolor: '#fbfbfb', fontSize: 'small' }}>
                <Grid item xs={4}>
                  <Typography variant="body2" textAlign="left">
                    Include Previous Balance: <strong>{filters.includePreviousBalance ? 'Yes' : 'No'}</strong>
                  </Typography>
                  <Typography variant="body2" textAlign="left">
                    Date: <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                   <Typography variant="body2">
                    Status: <strong>{filters.statuses.join(', ')}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    Month: <strong>{formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)))}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Year: <strong>{parseMonthYear(filters.monthYear).year}</strong>
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, p: 1, bgcolor: '#eee', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  Class: {filters.className === 'All' ? 'All Classes' : filters.className}
                </Typography>
                <Typography variant="body2" fontWeight="bold">Total Received: {formatCurrency(summary.totalReceived)}</Typography>
                <Typography variant="body2" fontWeight="bold">Total Remaining: {formatCurrency(summary.totalRemaining)}</Typography>
                <Typography variant="body2" fontWeight="bold">Total Due: {formatCurrency(summary.totalDue)}</Typography>
              </Box>
            </Box>

            {/* Table */}
            <TableContainer sx={{ border: '1px solid #eee' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Sr#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Std. ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Roll#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Adm#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Father Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Monthly Fee</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Pre Months Fine Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Due</TableCell>
                    
                    {/* Headwise Headers */}
                    <TableCell sx={{ p: 0, minWidth: 200 }}>
                       <Box sx={{ borderBottom: '1px solid #ddd', textAlign: 'center', py: 0.5 }}>Headwise Detail</Box>
                       <Box sx={{ display: 'flex' }}>
                         {feeHeads.map(head => (
                           <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '9px', fontWeight: 'bold' }}>
                             {head}
                           </Box>
                         ))}
                       </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((item, index) => {
                    // Check if this is a new class group
                    const showHeader = index === 0 || item.displayClassName !== reportData[index - 1].displayClassName;
                    
                    return (
                      <React.Fragment key={item.student?._id}>
                        {showHeader && (
                          <TableRow sx={{ bgcolor: '#f0f4ff' }}>
                            <TableCell colSpan={11 + feeHeads.length} sx={{ py: 0.5, px: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold" color="#667eea">
                                Class: {item.displayClassName}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                          <TableCell sx={{ fontSize: '10px' }}>{index + 1}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.enrollmentNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.rollNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.applicationNumber || item.student?.admissionNo || item.student?.admissionNumber || item.student?.admission?.applicationNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.personalDetails?.name || item.student?.name || item.student?.user?.name || item.student?.admission?.personalInfo?.name || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.guardianInfo?.fatherName || item.student?.admission?.guardianInfo?.fatherName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.monthlyFees.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.totalReceived.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.totalRemaining.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>0</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right', fontWeight: 'bold' }}>{item.totalDue.toLocaleString()}.00</TableCell>
                          
                          {/* Headwise Cells */}
                          <TableCell sx={{ p: 0 }}>
                            <Box sx={{ display: 'flex', height: '100%' }}>
                              {feeHeads.map(head => (
                                <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '10px' }}>
                                  {item.headwise[head] ? item.headwise[head].toLocaleString() : '0'}
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow sx={{ bgcolor: '#eee' }}>
                    <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'left' }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {reportData.reduce((acc, curr) => acc + curr.monthlyFees, 0).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalReceived.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalRemaining.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>0</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalDue.toLocaleString()}.00
                    </TableCell>
                    <TableCell sx={{ p: 0 }}>
                       <Box sx={{ display: 'flex' }}>
                          {feeHeads.map(head => (
                            <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '10px', fontWeight: 'bold' }}>
                              {reportData.reduce((acc, curr) => acc + (curr.headwise[head] || 0), 0).toLocaleString()}
                            </Box>
                          ))}
                        </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer */}
            <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.secondary">
                Print Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ) : (
        !loading && (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px dashed #ccc' }}>
            <Typography variant="h6" color="text.secondary">
              No data found for the selected filters.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please select Class, Section and Month/Year and click Search.
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
};

export default FeeListReport;
