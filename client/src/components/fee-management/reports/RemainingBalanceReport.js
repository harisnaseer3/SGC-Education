import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  Print as PrintIcon, 
  GetApp as DownloadIcon,
  ArrowBack,
  Search
} from '@mui/icons-material';
import axios from 'axios';
import { format, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { 
  getInstitutionId, 
  createAxiosConfig,
  parseMonthYear,
  formatMonthYear,
  exportToExcelWithBoldHeaders
} from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const RemainingBalanceReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [institutionData, setInstitutionData] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const currentInstitutionId = getInstitutionId(user, isSuperAdmin);

  const [availableStatuses] = useState([
    'Enrolled', 'Soft Admission', 'Struck Off', 'Expelled', 'Freeze', 'School Leaving'
  ]);

  const [filters, setFilters] = useState({
    institution: currentInstitutionId || '',
    filterMode: 'voucher', // Default to month & year (voucher wise)
    classId: 'all',
    studentStatus: ['All'],
    includeStruckOff: false,
    monthYear: format(new Date(), 'yyyy-MM'),
    dateFrom: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    viewType: 'full',
    paymentStatus: 'all'
  });

  useEffect(() => {
    // If institution changes in navbar (localStorage), update filters and refetch institution data
    setFilters(prev => ({ ...prev, institution: currentInstitutionId }));
    if (currentInstitutionId) {
      fetchInstitutionData(currentInstitutionId);
    }
  }, [currentInstitutionId]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInstitutionData = async (instId) => {
    try {
      const response = await axios.get(`${API_URL}/institutions/${instId}`, createAxiosConfig());
      setInstitutionData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institution data', err);
    }
  };

  const fetchInitialData = async () => {
    try {
      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig());
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
      console.error('Failed to fetch initial data', err);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);

      let targetMonth, targetYear;
      if (filters.filterMode === 'voucher') {
        const { month, year } = parseMonthYear(filters.monthYear);
        targetMonth = Number(month);
        targetYear = Number(year);
      } else {
        const toDateObj = filters.dateTo ? new Date(filters.dateTo) : new Date();
        targetMonth = toDateObj.getMonth() + 1;
        targetYear = toDateObj.getFullYear();
      }

      const params = {
        institution: institutionId,
      };

      const apiCalls = [
        axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params }))
      ];

      if (filters.filterMode === 'dateRange') {
        apiCalls.push(
          axios.get(`${API_URL}/fees/payments`, createAxiosConfig({
            params: {
              institution: institutionId,
              startDate: filters.dateFrom,
              endDate: filters.dateTo
            }
          }))
        );
      }

      const [feesResponse, paymentsResponse] = await Promise.all(apiCalls);
      const allStudentFees = feesResponse.data.data || [];
      const rangePayments = paymentsResponse ? (paymentsResponse.data.data || []).filter(p => p.status === 'completed') : [];

      const paymentsByStudent = new Map();
      if (filters.filterMode === 'dateRange') {
        rangePayments.forEach(p => {
          const sId = p.student?._id?.toString() || (typeof p.student === 'string' ? p.student : null);
          if (sId) {
            if (!paymentsByStudent.has(sId)) paymentsByStudent.set(sId, []);
            paymentsByStudent.get(sId).push(p);
          }
        });
      }

      // First, group all fees by student
      const allFeesByStudent = new Map();
      allStudentFees.forEach(sf => {
        const studentId = sf.student?._id?.toString() || (typeof sf.student === 'string' ? sf.student : null);
        if (studentId) {
          if (!allFeesByStudent.has(studentId)) {
            allFeesByStudent.set(studentId, []);
          }
          allFeesByStudent.get(studentId).push(sf);
        }
      });

      // Filter students based on Class Name and Status
      const studentMap = new Map();
      allStudentFees.forEach(sf => {
        const admission = sf.student?.admission || {};
        const student = sf.student || {};
        const studentId = student._id?.toString() || (typeof student === 'string' ? student : null);
        if (!studentId) return;

        if (filters.classId !== 'all') {
          const classId = admission.class?._id || student.currentClass?._id || admission.class || student.currentClass;
          if (classId?.toString() !== filters.classId) return;
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

        // Struck Off check:
        // Exclude struck off students ONLY if they were effectively struck off in or before this month,
        // unless includeStruckOff is true or user explicitly selected 'Struck Off' in studentStatus
        if (isEffectiveStruckOff && !filters.includeStruckOff) {
          const explicitlyRequested = filters.studentStatus && filters.studentStatus.some(s => s.toLowerCase() === 'struck off');
          if (!explicitlyRequested) return;
        }

        if (filters.studentStatus.length > 0 && !filters.studentStatus.includes('All')) {
          const effectiveStatus = isEffectiveStruckOff ? (student.status || admission.status || 'Struck Off') : 'Enrolled';
          const matchStatus = filters.studentStatus.some(s => 
            s.toLowerCase() === effectiveStatus.toLowerCase() || 
            s.toLowerCase() === (student.status || admission.status || '').toLowerCase()
          );
          if (!matchStatus) return;
        }

        // Keep the most populated student object
        if (!studentMap.has(studentId) || (typeof sf.student === 'object' && sf.student?.admission)) {
          studentMap.set(studentId, sf.student);
        }
      });

      const studentsGroup = new Map();
      const feeHeadsMap = new Map();

      studentMap.forEach((studentObj, studentId) => {
        const studentAllFees = allFeesByStudent.get(studentId) || [];
        const studentPaymentsInRange = paymentsByStudent.get(studentId) || [];

        // Check relevant vouchers up to target month/year
        const relevantVouchers = studentAllFees.filter(sf => 
          (sf.vouchers || []).some(v => {
            const vMonth = Number(v.month);
            const vYear = Number(v.year);
            return vYear < targetYear || (vYear === targetYear && vMonth <= targetMonth);
          })
        );
        if (relevantVouchers.length === 0 && studentPaymentsInRange.length === 0) return;

        // In date range mode when "all classes" is selected, if student has no payment in range, skip to keep report focused
        if (filters.filterMode === 'dateRange' && filters.classId === 'all' && studentPaymentsInRange.length === 0) {
          return;
        }

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

        // If no fee in current month, no previous dues, and no payments in range, skip
        if (currentMonthFees.length === 0 && outstandingPrev <= 0 && studentPaymentsInRange.length === 0) {
          return;
        }

        const arrearsFee = currentMonthFees.find(sf => sf.feeHead?.name?.toLowerCase() === 'arrears');
        const regularFees = currentMonthFees.filter(sf => sf.feeHead?.name?.toLowerCase() !== 'arrears');

        const arrearsPaymentsOnVoucher = arrearsFee ? parseFloat(arrearsFee.paidAmount || 0) : 0;

        // Previous Balance (P.Bal):
        // Prefer live ledger dues (outstandingPrev + any payment made on this voucher's arrears) to reflect any payments made after voucher generation.
        // Fall back to arrearsFee snapshot only if no prior billing history exists (e.g. initial starting arrears balance).
        let previousBalance = 0;
        if (outstandingPrev > 0 || (totalBilledPrev > 0 || totalPaidPrev > 0)) {
          previousBalance = Math.max(0, Math.round((outstandingPrev + arrearsPaymentsOnVoucher) * 100) / 100);
        } else if (arrearsFee && parseFloat(arrearsFee.finalAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsFee.finalAmount || 0);
        } else if (arrearsFee && parseFloat(arrearsFee.baseAmount || 0) > 0) {
          previousBalance = parseFloat(arrearsFee.baseAmount || 0);
        } else {
          previousBalance = outstandingPrev;
        }

        const currentBalance = regularFees.reduce((sum, sf) => sum + parseFloat(sf.finalAmount || 0), 0);
        const receivable = previousBalance + currentBalance;

        let received = 0;
        if (filters.filterMode === 'dateRange') {
          // In date range mode, Received is the sum of payments made in this date range
          received = studentPaymentsInRange.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        } else {
          // In voucher mode, sum of payments made against this voucher (regular fees + arrears head on this voucher)
          const currentReceived = regularFees.reduce((sum, sf) => sum + parseFloat(sf.paidAmount || 0), 0);
          received = currentReceived + arrearsPaymentsOnVoucher;
        }

        const remaining = Math.max(0, receivable - received);

        // Collect fee heads for head-wise view
        const heads = {};
        currentMonthFees.forEach(sf => {
          const headId = sf.feeHead?._id?.toString();
          if (headId) {
            heads[headId] = (heads[headId] || 0) + parseFloat(sf.finalAmount || 0);
            if (!feeHeadsMap.has(headId)) {
              feeHeadsMap.set(headId, { 
                _id: headId, 
                name: sf.feeHead.name, 
                priority: sf.feeHead.priority ?? 99 
              });
            }
          }
        });

        const admission = studentObj?.admission || {};
        const rawStatus = (studentObj?.status || admission?.status || '').toLowerCase().trim();
        const isStruckOffRaw = rawStatus === 'struck off' || rawStatus === 'struck_off' || rawStatus === 'struckoff';

        let isEffectiveStruckOff = false;
        if (isStruckOffRaw) {
          const hasCurrentMonthVoucher = studentAllFees.some(f => 
            (f.vouchers || []).some(v => Number(v.month) === targetMonth && Number(v.year) === targetYear)
          );
          let struckOffDate = null;
          if (studentObj?.statusHistory && Array.isArray(studentObj.statusHistory)) {
            const struckEntry = [...studentObj.statusHistory]
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
          if (!struckOffDate && (studentObj?.updatedAt || admission?.updatedAt)) {
            struckOffDate = new Date(studentObj.updatedAt || admission.updatedAt);
          }
          const targetMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
          if (struckOffDate) {
            isEffectiveStruckOff = struckOffDate <= targetMonthEnd;
          } else {
            isEffectiveStruckOff = !hasCurrentMonthVoucher;
          }
        }

        studentsGroup.set(studentId, {
          studentId,
          enrollmentNumber: studentObj?.enrollmentNumber || 'N/A',
          admissionNumber: admission.applicationNumber || 'N/A',
          rollNumber: studentObj?.rollNumber || 'N/A',
          studentName: studentObj?.user?.name || admission.personalInfo?.name || studentObj?.name || 'N/A',
          fatherName: admission.guardianInfo?.fatherName || 'N/A',
          class: admission.class?.name || studentObj?.currentClass?.name || 'Unassigned',
          section: admission.section?.name || 'Unassigned',
          isStruckOff: isEffectiveStruckOff,
          previousBalance,
          currentBalance,
          receivable,
          received,
          remaining,
          heads
        });
      });

      let finalData = Array.from(studentsGroup.values());

      // Filter by Payment Status
      if (filters.paymentStatus !== 'all') {
        finalData = finalData.filter(row => {
          if (filters.paymentStatus === 'paid') return row.remaining === 0 && row.receivable > 0;
          if (filters.paymentStatus === 'not_paid') return row.received === 0 && row.receivable > 0;
          if (filters.paymentStatus === 'partially_paid') return row.received > 0 && row.remaining > 0;
          return true;
        });
      }

      // Sort
      finalData.sort((a, b) => {
         const classComp = a.class.localeCompare(b.class);
         if (classComp !== 0) return classComp;
         return a.studentName.localeCompare(b.studentName);
      });

      const summary = finalData.reduce((acc, curr) => ({
        totalPBal: acc.totalPBal + curr.previousBalance,
        totalCBal: acc.totalCBal + curr.currentBalance,
        totalReceivable: acc.totalReceivable + curr.receivable,
        totalReceived: acc.totalReceived + curr.received,
        totalRemaining: acc.totalRemaining + curr.remaining
      }), { totalPBal: 0, totalCBal: 0, totalReceivable: 0, totalReceived: 0, totalRemaining: 0 });

      setReportData({
        data: finalData,
        feeHeads: Array.from(feeHeadsMap.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.name.localeCompare(b.name)),
        viewType: filters.viewType,
        summary
      });
    } catch (err) {
      console.error('Failed to generate report', err);
      alert(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const { data, feeHeads, viewType } = reportData;
    
    let exportData = data.map((row, idx) => {
      const exportRow = {
        'Sr No': idx + 1,
        'Std Id': row.enrollmentNumber,
        'Adm #': row.admissionNumber,
        'Roll #': row.rollNumber,
        'Std Name': row.studentName,
        'Father Name': row.fatherName,
        'Class': row.class,
        'Section': row.section
      };

      if (viewType === 'head-wise') {
        feeHeads.forEach(head => {
          exportRow[head.name] = (row.heads && row.heads[head._id]) || 0;
        });
      } else {
        exportRow['P.Bal'] = row.previousBalance;
        exportRow['C.Bal'] = row.currentBalance;
        exportRow['Receivable'] = row.receivable;
        exportRow['Received'] = row.received;
        exportRow['Remaining'] = row.remaining;
      }
      return exportRow;
    });

    const selectedClass = classes.find(c => c._id === filters.classId);

    const exportMetadata = {
      'Class': selectedClass ? selectedClass.name : 'All Classes',
      'Payment Status': filters.paymentStatus,
      'Include Struck Off': filters.includeStruckOff ? 'Yes' : 'No'
    };

    if (filters.filterMode === 'dateRange') {
      exportMetadata['Payment Date From'] = filters.dateFrom ? format(new Date(filters.dateFrom), 'dd/MM/yyyy') : '';
      exportMetadata['Payment Date To'] = filters.dateTo ? format(new Date(filters.dateTo), 'dd/MM/yyyy') : '';
    } else {
      exportMetadata['Month'] = formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)));
    }

    const filename = filters.filterMode === 'dateRange'
      ? `Remaining_Balance_${filters.dateFrom}_to_${filters.dateTo}.xlsx`
      : `Remaining_Balance_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    exportToExcelWithBoldHeaders(
      XLSX, 
      exportData, 
      'Remaining Balance', 
      filename,
      exportMetadata
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = () => {
    if (!reportData) return null;
    const { data, feeHeads, viewType, summary } = reportData;
    
    // Group by class/section
    const groupedData = data.reduce((acc, row) => {
      const key = `${row.class} - ${row.section}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    return (
      <Box sx={{ mt: 4, '@media print': { mt: 0 } }} className="printable-report">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .printable-report, .printable-report * { visibility: visible; }
              .printable-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              @page { size: landscape; margin: 10mm; }
              .no-print { display: none !important; }
            }
          `}
        </style>

        {/* Report Header with Branding */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #667eea', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {institutionData?.logo && (
              <Box
                component="img"
                src={getLogoUrl(institutionData.logo, institutionData._id)}
                sx={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid #ddd' }}
              />
            )}
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {institutionData?.name || 'Remaining Balance Report'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {institutionData?.address?.city || ''} {institutionData?.address?.state || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" color="#667eea" fontWeight="bold">Remaining Balance Report</Typography>
            {filters.filterMode === 'dateRange' ? (
              <Typography variant="body2">
                Payment Date: {filters.dateFrom ? format(new Date(filters.dateFrom), 'dd/MM/yyyy') : ''} to {filters.dateTo ? format(new Date(filters.dateTo), 'dd/MM/yyyy') : ''}
              </Typography>
            ) : (
              <Typography variant="body2">Month: {formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)))}</Typography>
            )}
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Print Date: {format(new Date(), 'dd MMM yyyy hh:mm a')}
            </Typography>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ border: '1px solid #eee' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Sr No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Std Id</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Adm #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Roll #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Std Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Father Name</TableCell>
                {viewType === 'head-wise' ? (
                  feeHeads.map(head => (
                    <TableCell key={head._id} sx={{ fontWeight: 'bold' }}>{head.name}</TableCell>
                  ))
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }}>P.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>C.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Receivable</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(groupedData).map(([groupKey, students]) => {
                const groupSubtotal = students.reduce((acc, s) => ({
                  p: acc.p + s.previousBalance,
                  c: acc.c + s.currentBalance,
                  rec: acc.rec + s.receivable,
                  received: acc.received + s.received,
                  rem: acc.rem + s.remaining
                }), { p: 0, c: 0, rec: 0, received: 0, rem: 0 });

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell colSpan={6 + (viewType === 'head-wise' ? feeHeads.length : 5)} sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        {groupKey}
                      </TableCell>
                    </TableRow>
                    {students.map((row, idx) => (
                      <TableRow key={row.studentId}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.enrollmentNumber}</TableCell>
                        <TableCell>{row.admissionNumber}</TableCell>
                        <TableCell>{row.rollNumber}</TableCell>
                        <TableCell>
                          {row.studentName}
                          {row.isStruckOff && (
                            <Chip 
                              label="Struck Off" 
                              size="small" 
                              color="error" 
                              variant="outlined" 
                              sx={{ height: 18, fontSize: '0.65rem', ml: 1, verticalAlign: 'middle' }} 
                            />
                          )}
                        </TableCell>
                        <TableCell>{row.fatherName}</TableCell>
                        {viewType === 'head-wise' ? (
                          feeHeads.map(head => (
                            <TableCell key={head._id}>{(row.heads && row.heads[head._id])?.toLocaleString() || 0}</TableCell>
                          ))
                        ) : (
                          <>
                            <TableCell>{row.previousBalance.toLocaleString()}</TableCell>
                            <TableCell>{row.currentBalance.toLocaleString()}</TableCell>
                            <TableCell>{row.receivable.toLocaleString()}</TableCell>
                            <TableCell>{row.received.toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{row.remaining.toLocaleString()}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                    {viewType !== 'head-wise' && (
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.p.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.c.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.rec.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.received.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.rem.toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {viewType !== 'head-wise' && (
                <TableRow sx={{ bgcolor: '#eee' }}>
                  <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Grand Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalPBal.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalCBal.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalReceivable.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalReceived.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalRemaining.toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box className="no-print">
        <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            {/* Filter Mode Toggle & Struck Off Option */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', minWidth: 90 }}>
                  Filter Mode:
                </Typography>
                <RadioGroup
                  row
                  value={filters.filterMode}
                  onChange={(e) => setFilters({ ...filters, filterMode: e.target.value })}
                >
                  <FormControlLabel
                    value="voucher"
                    control={<Radio size="small" sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                    label={
                      <Typography variant="body2" fontWeight={filters.filterMode === 'voucher' ? 700 : 400}>
                        Month & Year (Voucher Wise)
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="dateRange"
                    control={<Radio size="small" sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                    label={
                      <Typography variant="body2" fontWeight={filters.filterMode === 'dateRange' ? 700 : 400}>
                        Payment Date Range
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(filters.includeStruckOff)}
                    onChange={(e) => setFilters({ ...filters, includeStruckOff: e.target.checked })}
                    sx={{ color: '#e53e3e', '&.Mui-checked': { color: '#e53e3e' } }}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={filters.includeStruckOff ? 700 : 500} sx={{ color: filters.includeStruckOff ? '#e53e3e' : '#475569' }}>
                    Include Struck Off Students (Arrears)
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={filters.classId}
                    label="Class"
                    onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                  >
                    <MenuItem value="all">All Classes</MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  multiple
                  size="small"
                  options={['All', ...availableStatuses]}
                  value={filters.studentStatus}
                  onChange={(e, newValue) => {
                    if (newValue.length === 0) {
                      setFilters({ ...filters, studentStatus: ['All'] });
                    } else if (newValue.includes('All') && !filters.studentStatus.includes('All')) {
                      setFilters({ ...filters, studentStatus: ['All'] });
                    } else if (newValue.includes('All') && newValue.length > 1) {
                      setFilters({ ...filters, studentStatus: newValue.filter(v => v !== 'All') });
                    } else {
                      setFilters({ ...filters, studentStatus: newValue });
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

              <Grid item xs={6} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={filters.paymentStatus}
                    label="Payment Status"
                    onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="not_paid">Not Paid</MenuItem>
                    <MenuItem value="partially_paid">Partially Paid</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>View Type</InputLabel>
                  <Select
                    value={filters.viewType}
                    label="View Type"
                    onChange={(e) => setFilters({ ...filters, viewType: e.target.value })}
                  >
                    <MenuItem value="full">Full Summary</MenuItem>
                    <MenuItem value="head-wise">Head-wise</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Filters Row */}
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="month"
                  label="Month & Year"
                  value={filters.monthYear}
                  onChange={(e) => setFilters({ ...filters, monthYear: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={filters.filterMode !== 'voucher'}
                  sx={{
                    bgcolor: filters.filterMode !== 'voucher' ? '#f1f5f9' : 'transparent',
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#94a3b8'
                    }
                  }}
                  helperText={filters.filterMode !== 'voucher' ? 'Disabled in date range mode' : ''}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Payment Date From"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={filters.filterMode !== 'dateRange'}
                  sx={{
                    bgcolor: filters.filterMode !== 'dateRange' ? '#f1f5f9' : 'transparent',
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#94a3b8'
                    }
                  }}
                  helperText={filters.filterMode !== 'dateRange' ? 'Disabled in voucher mode' : ''}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Payment Date To"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={filters.filterMode !== 'dateRange'}
                  sx={{
                    bgcolor: filters.filterMode !== 'dateRange' ? '#f1f5f9' : 'transparent',
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#94a3b8'
                    }
                  }}
                  helperText={filters.filterMode !== 'dateRange' ? 'Disabled in voucher mode' : ''}
                />
              </Grid>

              <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5 }}>
                <Button 
                  variant="contained" 
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                  onClick={handleGenerate}
                  disabled={loading}
                  sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, height: '40px', px: 3 }}
                >
                  Search
                </Button>
                {reportData && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<PrintIcon />}
                      onClick={handlePrint}
                      sx={{ textTransform: 'uppercase', fontWeight: 600, height: '40px' }}
                    >
                      PRINT
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportExcel}
                      sx={{ textTransform: 'uppercase', fontWeight: 600, height: '40px' }}
                    >
                      EXPORT
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {renderTable()}
    </Box>
  );
};

export default RemainingBalanceReport;
