import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Divider,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Payment,
  Business,
  Domain,
  People,
  ClearAll,
  AllInclusive,
  MonetizationOn,
  TrendingDown,
  Assessment,
  PersonOff,
  School,
  HourglassEmpty,
  FileDownload,
  Print,
  TableChart,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import axios from 'axios';
import * as XLSX from 'xlsx-js-style';
import { getApiUrl } from '../config/api';
import { useNavigate, useLocation } from 'react-router-dom';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

const StatCard = ({ title, value, icon, color, subtitle, trend, compact = false, onClick }) => (
  <Card
    onClick={onClick}
    elevation={0}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      background: `linear-gradient(135deg, ${color}10 0%, #ffffff 100%)`,
      border: `1px solid ${color}20`,
      borderRadius: 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      minHeight: 80,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      '&:hover': {
        transform: onClick ? 'translateY(-6px)' : 'none',
        boxShadow: onClick ? `0 20px 40px ${color}15` : '0 4px 20px rgba(0,0,0,0.03)',
        border: onClick ? `1px solid ${color}40` : `1px solid ${color}20`,
      }
    }}
  >
    <CardContent sx={{ 
      p: compact ? 2.5 : 3.5, 
      '&:last-child': { pb: compact ? 2.5 : 3.5 },
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', opacity: 0.8 }}>
            {title}
          </Typography>
          <Typography variant={compact ? 'subtitle1' : 'h4'} fontWeight="800" color={color} sx={{ lineHeight: 1.3, wordBreak: 'break-word', fontSize: compact ? { xs: '1rem', sm: '1.1rem', md: '1.15rem' } : undefined }}>
            {value}
          </Typography>
          {(subtitle || trend) && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {subtitle && <Typography component="div" variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem', width: '100%' }}>{subtitle}</Typography>}
              {trend && (
                <Chip 
                  label={`+${trend}`}
                  size="small"
                  icon={<TrendingUp sx={{ fontSize: '12px !important', color: 'inherit !important' }} />}
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem', 
                    fontWeight: 700,
                    bgcolor: 'success.main', 
                    color: 'white',
                    '& .MuiChip-icon': { ml: 0.5 }
                  }}
                />
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ 
          p: compact ? 1.5 : 2, 
          borderRadius: 3, 
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `0 8px 16px ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {React.cloneElement(icon, { sx: { fontSize: compact ? 28 : 36, color: '#fff' } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Helper functions for date formatting in local time
const getStartOfMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const preserveFilters = location.state?.preserveFilters;
  
  // Filters State
  const [selectedCampus, setSelectedCampus] = useState(() => {
    if (preserveFilters) {
      return sessionStorage.getItem('finance_selectedCampus') || 'all';
    }
    sessionStorage.removeItem('finance_selectedCampus');
    return 'all';
  });

  const [startDate, setStartDate] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_startDate');
      if (saved !== null) return saved;
    }
    sessionStorage.removeItem('finance_startDate');
    return getStartOfMonth();
  });

  const [endDate, setEndDate] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_endDate');
      if (saved !== null) return saved;
    }
    sessionStorage.removeItem('finance_endDate');
    return getTodayDate();
  });

  const [campusList, setCampusList] = useState([]);
  const [activeReportTab, setActiveReportTab] = useState('admissions');

  // All Campus Receivable Report States
  const [receivableFilterType, setReceivableFilterType] = useState('date'); // 'month' | 'date'
  const [receivableMonth, setReceivableMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [receivablePaymentStart, setReceivablePaymentStart] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_startDate');
      if (saved !== null) return saved;
    }
    return getStartOfMonth();
  });
  const [receivablePaymentEnd, setReceivablePaymentEnd] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_endDate');
      if (saved !== null) return saved;
    }
    return getTodayDate();
  });

  // Banks Statement Report States
  const [bankReportData, setBankReportData] = useState(null);
  const [bankReportLoading, setBankReportLoading] = useState(false);
  const [bankReportMode, setBankReportMode] = useState('auto');
  const [bankFilterType, setBankFilterType] = useState('date'); // 'month' | 'date'
  const [bankReportMonth, setBankReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bankPaymentStart, setBankPaymentStart] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_startDate');
      if (saved !== null) return saved;
    }
    return getStartOfMonth();
  });
  const [bankPaymentEnd, setBankPaymentEnd] = useState(() => {
    if (preserveFilters) {
      const saved = sessionStorage.getItem('finance_endDate');
      if (saved !== null) return saved;
    }
    return getTodayDate();
  });

  const isAllTime = !startDate && !endDate;

  const handleStartDateChange = (val) => {
    setStartDate(val);
    setReceivablePaymentStart(val);
    setBankPaymentStart(val);
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    setReceivablePaymentEnd(val);
    setBankPaymentEnd(val);
  };

  const handleAllTime = () => {
    setStartDate('');
    setEndDate('');
    setReceivablePaymentStart('');
    setReceivablePaymentEnd('');
    setBankPaymentStart('');
    setBankPaymentEnd('');
    sessionStorage.setItem('finance_startDate', '');
    sessionStorage.setItem('finance_endDate', '');
  };

  const handleClearFilters = () => {
    const startOfMonth = getStartOfMonth();
    const today = getTodayDate();
    setSelectedCampus('all');
    setStartDate(startOfMonth);
    setEndDate(today);
    setReceivablePaymentStart(startOfMonth);
    setReceivablePaymentEnd(today);
    setBankPaymentStart(startOfMonth);
    setBankPaymentEnd(today);
    sessionStorage.setItem('finance_selectedCampus', 'all');
    sessionStorage.setItem('finance_startDate', startOfMonth);
    sessionStorage.setItem('finance_endDate', today);
  };

  useEffect(() => {
    sessionStorage.setItem('finance_selectedCampus', selectedCampus);
    sessionStorage.setItem('finance_startDate', startDate);
    sessionStorage.setItem('finance_endDate', endDate);
    fetchDashboardStats();
  }, [selectedCampus, startDate, endDate, receivableFilterType, receivableMonth, receivablePaymentStart, receivablePaymentEnd]);

  useEffect(() => {
    fetchBanksReportData();
  }, [selectedCampus, startDate, endDate, bankFilterType, bankReportMonth, bankReportMode, bankPaymentStart, bankPaymentEnd]);

  const fetchBanksReportData = async () => {
    try {
      setBankReportLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (bankReportMode) params.append('mode', bankReportMode);

      // Mutually exclusive: fetch according to only one filter
      if (bankFilterType === 'month') {
        if (bankReportMonth) {
          params.append('monthKey', bankReportMonth);
        }
      } else {
        const bStart = startDate !== undefined && startDate !== null ? startDate : bankPaymentStart;
        const bEnd = endDate !== undefined && endDate !== null ? endDate : bankPaymentEnd;
        if (bStart) {
          params.append('paymentStartDate', bStart);
          params.append('startDate', bStart);
        }
        if (bEnd) {
          params.append('paymentEndDate', bEnd);
          params.append('endDate', bEnd);
        }
      }

      if (selectedCampus && selectedCampus !== 'all') {
        params.append('institution', selectedCampus);
      }

      if (!startDate && !endDate) {
        params.append('allTime', 'true');
      }

      const response = await axios.get(`${getApiUrl('dashboard/banks-statement-report')}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.success) {
        setBankReportData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch banks statement report:', err);
    } finally {
      setBankReportLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('view', 'finance');
      if (selectedCampus && selectedCampus !== 'all') {
        params.append('institution', selectedCampus);
      }

      // Mutually exclusive: fetch according to only one filter
      if (receivableFilterType === 'month') {
        if (receivableMonth) {
          params.append('monthKey', receivableMonth);
        }
      } else {
        const rStart = startDate !== undefined && startDate !== null ? startDate : receivablePaymentStart;
        const rEnd = endDate !== undefined && endDate !== null ? endDate : receivablePaymentEnd;
        if (rStart) {
          params.append('paymentStartDate', rStart);
          params.append('startDate', rStart);
        }
        if (rEnd) {
          params.append('paymentEndDate', rEnd);
          params.append('endDate', rEnd);
        }
      }

      if (!startDate && !endDate) {
        params.append('allTime', 'true');
      }
      
      const response = await axios.get(`${getApiUrl('dashboard/stats')}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data;
      setDashboardData(data);
      
      // Initialize campus list if not yet populated
      if (data?.campusBreakdown && campusList.length === 0) {
        setCampusList(data.campusBreakdown.map(c => ({ _id: c._id, name: c.name, code: c.code })));
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAdmissionRegister = () => {
    if (!dashboardData?.campusBreakdown) return;

    const list = selectedCampus === 'all'
      ? dashboardData.campusBreakdown
      : dashboardData.campusBreakdown.filter(c => c._id === selectedCampus);

    const totalAdmissionsSum = list.reduce((sum, c) => sum + (c.totalAdmissions || c.totalStudents || 0), 0);
    const enrolledSum = list.reduce((sum, c) => sum + (c.enrolled ?? c.activeStudents ?? 0), 0);
    const stuckoffSum = list.reduce((sum, c) => sum + (c.struckoff ?? c.struckOffStudents ?? 0), 0);
    const pendingSum = list.reduce((sum, c) => sum + (c.pending ?? c.pendingStudents ?? 0), 0);

    const aoaData = [
      ['Admission Register Report', '', '', '', '', ''],
      ['S. #', 'Campus', 'Total Admissions', 'Enrolled', 'Stuckoff', 'Pending']
    ];

    list.forEach((campus, index) => {
      aoaData.push([
        index + 1,
        campus.name,
        campus.totalAdmissions || campus.totalStudents || 0,
        campus.enrolled ?? campus.activeStudents ?? 0,
        campus.struckoff ?? campus.struckOffStudents ?? 0,
        campus.pending ?? campus.pendingStudents ?? 0
      ]);
    });

    aoaData.push([
      '',
      'Grand total',
      totalAdmissionsSum,
      enrolledSum,
      stuckoffSum,
      pendingSum
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
    ];

    ws['!cols'] = [
      { wch: 8 },
      { wch: 38 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];

    try {
      const borderStyle = {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } }
      };

      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          border: borderStyle
        };
      }

      ['A2', 'B2', 'C2', 'D2', 'E2', 'F2'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, color: { rgb: '1E293B' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            border: borderStyle
          };
        }
      });

      for (let r = 2; r < 2 + list.length; r++) {
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          const cellRef = `${col}${r + 1}`;
          if (ws[cellRef]) {
            ws[cellRef].s = {
              alignment: { horizontal: col === 'B' ? 'left' : 'center', vertical: 'center' },
              border: borderStyle
            };
          }
        });
      }

      const grandRow = 2 + list.length + 1;
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
        const cellRef = `${col}${grandRow}`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, color: { rgb: '0F172A' } },
            alignment: { horizontal: col === 'B' ? 'left' : 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            border: {
              top: { style: 'medium', color: { rgb: '64748B' } },
              bottom: { style: 'double', color: { rgb: '64748B' } },
              left: { style: 'thin', color: { rgb: 'D1D5DB' } },
              right: { style: 'thin', color: { rgb: 'D1D5DB' } }
            }
          };
        }
      });
    } catch (e) {
      console.warn('Styling failed, writing standard xlsx', e);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admission Register');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Admission_Register_Report_${dateStr}.xlsx`);
  };

  const getVouchersHeader = () => {
    if (receivableFilterType === 'date') {
      return 'Vouchers';
    }
    let date = new Date();
    if (receivableMonth) {
      const parts = receivableMonth.split('-');
      if (parts.length === 2) {
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    } else if (startDate) {
      date = new Date(startDate);
    } else {
      return 'Vouchers (All Time)';
    }
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const yearShort = String(date.getFullYear()).slice(-2);
    return `Vouchers ${monthName}. ${yearShort}`;
  };

  const handleExportFinancialReport = () => {
    if (!dashboardData?.campusBreakdown) return;
    const list = selectedCampus === 'all'
      ? dashboardData.campusBreakdown
      : dashboardData.campusBreakdown.filter(c => c._id === selectedCampus);

    const vouchersHeader = getVouchersHeader();

    let titleText = 'All Campus Receiveable Report';
    if (receivableFilterType === 'date') {
      titleText += ` (Payment Date: ${receivablePaymentStart || 'Start'} to ${receivablePaymentEnd || 'End'})`;
    } else if (receivableMonth) {
      titleText += ` (Billing Month: ${receivableMonth})`;
    }

    const aoaData = [
      [titleText, '', '', '', '', '', '', ''],
      ['S. #', 'Capmpus', 'No. of Students', vouchersHeader, 'Arears', 'Grand Total', 'Received', 'Balance']
    ];

    let totalStudents = 0;
    let totalVouchers = 0;
    let totalArrears = 0;
    let totalGrand = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    list.forEach((c, idx) => {
      const students = c.activeStudents ?? c.enrolled ?? c.totalStudents ?? 0;
      const arrears = c.arrears ?? (c.previousReceivable || 0);
      const vouchers = c.vouchers !== undefined ? c.vouchers : Math.max(0, (c.feesGenerated || 0) - (c.previousReceivable || 0));
      const grandTotal = c.grandTotal ?? (vouchers + arrears);
      const received = c.received ?? (c.feesCollected || 0);
      const balance = c.balance ?? Math.max(0, grandTotal - received);

      totalStudents += students;
      totalVouchers += vouchers;
      totalArrears += arrears;
      totalGrand += grandTotal;
      totalReceived += received;
      totalBalance += balance;

      aoaData.push([
        idx + 1,
        c.name || c.code || '',
        students,
        vouchers,
        arrears,
        grandTotal,
        received,
        balance
      ]);
    });

    // Total row
    aoaData.push([
      '',
      'total',
      totalStudents,
      totalVouchers,
      totalArrears,
      totalGrand,
      totalReceived,
      totalBalance
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
    ];

    ws['!cols'] = [
      { wch: 8 },  // S. #
      { wch: 28 }, // Campus
      { wch: 18 }, // No. of Students
      { wch: 20 }, // Vouchers
      { wch: 18 }, // Arears
      { wch: 18 }, // Grand Total
      { wch: 18 }, // Received
      { wch: 18 }  // Balance
    ];

    try {
      const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderStyle
        };
      }

      ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 11, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borderStyle
          };
        }
      });

      const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (let r = 2; r < 2 + list.length; r++) {
        cols.forEach(col => {
          const cellRef = `${col}${r + 1}`;
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { sz: 11, name: 'Calibri', bold: col === 'F' || col === 'H' },
              alignment: { 
                horizontal: col === 'B' ? 'left' : (col === 'A' || col === 'C' ? 'center' : 'right'), 
                vertical: 'center' 
              },
              border: borderStyle
            };
          }
        });
      }

      const totalRowIdx = 2 + list.length + 1;
      cols.forEach(col => {
        const cellRef = `${col}${totalRowIdx}`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, sz: 11, underline: true, name: 'Calibri' },
            alignment: { 
              horizontal: col === 'B' ? 'center' : (col === 'A' || col === 'C' ? 'center' : 'right'), 
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'double', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      });
    } catch (e) {
      console.warn('Styling failed, writing standard xlsx', e);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Campus Receivable');
    const fileSuffix = receivableFilterType === 'date'
      ? `Pay_${receivablePaymentStart || 'Start'}_to_${receivablePaymentEnd || 'End'}`
      : (receivableMonth || new Date().toISOString().split('T')[0]);
    XLSX.writeFile(wb, `All_Campus_Receivable_Report_${fileSuffix}.xlsx`);
  };

  const handlePrintFinancialReport = () => {
    window.print();
  };

  const handlePrintAdmissionRegister = () => {
    window.print();
  };

  const handleExportBanksStatementReport = () => {
    if (!bankReportData || !bankReportData.campuses) return;
    const { campuses, rows, groups, grandTotals } = bankReportData;

    const aoaData = [];
    const totalCols = 2 + (campuses.length * 2) + 2 + 1;

    let titleText = 'Banks Statement Report';
    if (bankFilterType === 'date') {
      titleText += ` (Payment Date: ${bankPaymentStart || 'Start'} to ${bankPaymentEnd || 'End'})`;
    } else if (bankReportMonth) {
      titleText += ` (${bankReportMonth})`;
    }

    const titleRow = [titleText];
    for (let i = 1; i < totalCols; i++) titleRow.push('');
    aoaData.push(titleRow);

    // Header Row 1: S.#, Bank Name, Campus Names (merged 2 cols), Total (merged 2 cols), Group Total
    const headerRow1 = ['S. #', 'Banks / Campus'];
    campuses.forEach(c => {
      headerRow1.push(c.name || c.code);
      headerRow1.push('');
    });
    headerRow1.push('Total', '', 'Group Total');
    aoaData.push(headerRow1);

    // Header Row 2: Sub-columns (Reconciled, Suspense)
    const headerRow2 = ['', ''];
    campuses.forEach(() => {
      headerRow2.push('Reconciled', 'Suspense');
    });
    headerRow2.push('Reconciled', 'Suspense', '');
    aoaData.push(headerRow2);

    groups.forEach(group => {
      const groupRows = rows.filter(r => r.groupKey === group.groupKey);
      groupRows.forEach(r => {
        const row = [
          r.sNo,
          r.bankName,
          ...campuses.flatMap(c => {
            const val = r.campusAmounts?.[c._id];
            return [
              val?.reconciled !== undefined && val?.reconciled !== null ? val.reconciled : 0,
              val?.suspense !== undefined && val?.suspense !== null ? val.suspense : 0
            ];
          }),
          r.rowReconciledTotal || 0,
          r.rowSuspenseTotal || 0,
          r.groupTotal !== null && r.groupTotal !== undefined ? r.groupTotal : ''
        ];
        aoaData.push(row);
      });

      if (group.hasMultipleAccounts) {
        const subtotalRow = [
          '',
          group.subtotalLabel || `${group.groupKey} Main G.total`,
          ...campuses.flatMap(c => {
            const gVal = group.campusTotals?.[c._id];
            const rec = typeof gVal === 'object' ? gVal?.reconciled : gVal;
            const susp = typeof gVal === 'object' ? gVal?.suspense : 0;
            return [rec || 0, susp || 0];
          }),
          group.reconciledTotal || 0,
          group.suspenseTotal || 0,
          group.total || 0
        ];
        aoaData.push(subtotalRow);
      }
    });

    const grandRow = [
      '',
      'Grand Total',
      ...campuses.flatMap(c => {
        const gVal = grandTotals?.campusTotals?.[c._id];
        const rec = typeof gVal === 'object' ? gVal?.reconciled : gVal;
        const susp = typeof gVal === 'object' ? gVal?.suspense : 0;
        return [rec || 0, susp || 0];
      }),
      grandTotals?.reconciledTotal || 0,
      grandTotals?.suspenseTotal || 0,
      grandTotals?.total || 0
    ];
    aoaData.push(grandRow);

    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },             // S. #
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },             // Banks / Campus
    ];

    campuses.forEach((c, idx) => {
      const col = 2 + (idx * 2);
      merges.push({ s: { r: 1, c: col }, e: { r: 1, c: col + 1 } }); // Campus colSpan=2
    });

    const totCol = 2 + (campuses.length * 2);
    merges.push({ s: { r: 1, c: totCol }, e: { r: 1, c: totCol + 1 } }); // Total colSpan=2
    merges.push({ s: { r: 1, c: totCol + 2 }, e: { r: 2, c: totCol + 2 } }); // Group Total rowSpan=2

    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      ...campuses.flatMap(() => [{ wch: 15 }, { wch: 15 }]),
      { wch: 16 },
      { wch: 16 },
      { wch: 16 }
    ];

    try {
      const borderStyle = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      };

      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14, color: { rgb: '000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'FFFFFF' } },
          border: borderStyle
        };
      }

      for (let r = 1; r <= 2; r++) {
        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { bold: true, color: { rgb: '000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              fill: { fgColor: { rgb: 'F1F5F9' } },
              border: borderStyle
            };
          }
        }
      }

      for (let r = 2; r < aoaData.length; r++) {
        const isGrand = r === aoaData.length - 1;
        const isSubtotal = String(aoaData[r][1] || '').includes('G.total');
        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (ws[cellRef]) {
            ws[cellRef].s = {
              font: { bold: isGrand || isSubtotal, color: { rgb: '000000' }, underline: isGrand },
              alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
              border: isGrand ? {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'double', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              } : borderStyle,
              fill: isGrand ? { fgColor: { rgb: 'F8FAFC' } } : (isSubtotal ? { fgColor: { rgb: 'F1F5F9' } } : undefined)
            };
          }
        }
      }
    } catch (e) {
      console.warn('Styling failed, writing standard xlsx', e);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Banks Statement');
    const fileSuffix = bankFilterType === 'date'
      ? `Pay_${bankPaymentStart || 'Start'}_to_${bankPaymentEnd || 'End'}`
      : (bankReportMonth || new Date().toISOString().split('T')[0]);
    XLSX.writeFile(wb, `Banks_Statement_Report_${fileSuffix}.xlsx`);
  };

  // Process data for trends chart
  const formattedTrendData = (dashboardData?.trends?.feeCollectionTrend || []).map(item => {
    let d = new Date();
    if (item.date) {
      const parts = item.date.split('-');
      if (parts.length === 3) {
        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        d = new Date(item.date);
      }
    }
    return {
      ...item,
      formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  // Process data for campus comparison chart
  const campusChartData = (dashboardData?.campusBreakdown || []).map(c => ({
    name: c.code || c.name,
    fullName: c.name,
    Billed: c.feesGenerated,
    Collected: c.feesCollected,
    Outstanding: c.outstandingDues
  }));

  // Process student active distribution chart
  const studentDistributionData = (dashboardData?.campusBreakdown || []).map(c => ({
    name: c.code || c.name,
    value: c.activeStudents
  })).filter(c => c.value > 0);

  if (loading && !dashboardData) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Header and Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ mb: 1 }}>
            Financial Insights & Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyze fee-related metrics, student distributions, and campus-wise collections.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {user.role === 'super_admin' && (
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{
                fontWeight: 700,
                borderRadius: 2.5,
                borderColor: '#667eea',
                color: '#667eea',
                px: 2,
                py: 0.9,
                textTransform: 'none',
                bgcolor: 'rgba(102, 126, 234, 0.05)',
                '&:hover': {
                  borderColor: '#5a67d8',
                  bgcolor: 'rgba(102, 126, 234, 0.12)',
                },
              }}
            >
              Main Dashboard
            </Button>
          )}
          <Chip label="Finance Manager Dashboard" color="primary" icon={<Business />} sx={{ fontSize: '0.95rem', py: 2.5, px: 1.5, fontWeight: 'bold', borderRadius: 3 }} />
        </Box>
      </Box>

      {/* Filter Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 4, 
          border: '1px solid #edf2f7', 
          bgcolor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <Grid container spacing={2.5} alignItems="center">
          <Grid item xs={12} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="campus-select-label">Campus</InputLabel>
              <Select
                labelId="campus-select-label"
                value={selectedCampus}
                label="Campus"
                onChange={(e) => setSelectedCampus(e.target.value)}
                sx={{ borderRadius: 2.5 }}
              >
                <MenuItem value="all">
                  <em>All Campuses</em>
                </MenuItem>
                {campusList.map((campus) => (
                  <MenuItem key={campus._id} value={campus._id}>
                    {campus.name} ({campus.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={1.75}>
            <Button
              fullWidth
              variant={isAllTime ? "contained" : "outlined"}
              onClick={handleAllTime}
              startIcon={<AllInclusive />}
              sx={{ 
                borderRadius: 2.5, 
                textTransform: 'none', 
                fontWeight: 700, 
                height: '40px',
                ...(isAllTime ? {
                  bgcolor: '#6366f1',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                  '&:hover': { bgcolor: '#4f46e5' }
                } : {
                  borderColor: '#6366f1',
                  color: '#6366f1',
                  '&:hover': { borderColor: '#4f46e5', bgcolor: '#6366f10a' }
                })
              }}
            >
              All Time
            </Button>
          </Grid>
          
          <Grid item xs={6} sm={3} md={1.75}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
              startIcon={<ClearAll />}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, height: '40px' }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <CircularProgress size={30} sx={{ display: 'block', mx: 'auto' }} />
        </Box>
      )}

      {dashboardData && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2.5, width: '100%', mb: 4 }}>
            {[
              { 
                title: 'Total Billed', 
                value: `Rs. ${(dashboardData?.finance?.totalBilled || 0).toLocaleString()}`, 
                icon: <MonetizationOn />, 
                color: '#6366f1', 
                subtitle: 'Accounts receivable (billed volume)' 
              },
              { 
                title: 'Total Collected', 
                value: `Rs. ${(dashboardData?.finance?.totalCollected || 0).toLocaleString()}`, 
                icon: <Payment />, 
                color: '#10b981', 
                subtitle: 'Revenue (payments cleared)' 
              },
              { 
                title: 'Total Outstanding', 
                value: `Rs. ${(dashboardData?.finance?.totalOutstanding || 0).toLocaleString()}`, 
                icon: <AccountBalance />, 
                color: '#f59e0b', 
                subtitle: 'Total unpaid arrears' 
              },
              { 
                title: 'Previous Receivable', 
                value: `Rs. ${(dashboardData?.finance?.previousReceivable || 0).toLocaleString()}`, 
                icon: <TrendingDown />, 
                color: '#f43f5e', 
                subtitle: 'Outstanding arrears carried forward' 
              },
              { 
                title: 'Recovery', 
                value: `Rs. ${(dashboardData?.finance?.recovery || 0).toLocaleString()}`, 
                icon: <TrendingUp />, 
                color: '#06b6d4', 
                subtitle: 'Carried-forward arrears paid' 
              },
              { 
                title: 'Total Admissions', 
                value: (dashboardData?.overview?.totalStudents || 0).toLocaleString(), 
                icon: <School />, 
                color: '#8b5cf6', 
                subtitle: 'All application statuses combined' 
              },
              { 
                title: 'Active Students', 
                value: (dashboardData?.overview?.activeStudents || 0).toLocaleString(), 
                icon: <People />, 
                color: '#0ea5e9', 
                subtitle: 'Students with enrolled status' 
              },
              { 
                title: 'New Admissions', 
                value: (dashboardData?.overview?.newAdmissions || 0).toLocaleString(), 
                icon: <TrendingUp />, 
                color: '#ec4899', 
                subtitle: 'Newly enrolled in period' 
              },
              { 
                title: 'Stuck Off Students', 
                value: (dashboardData?.overview?.struckOffStudents || 0).toLocaleString(), 
                icon: <PersonOff />, 
                color: '#ef4444', 
                subtitle: 'Total struck off / withdrawn' 
              },
              { 
                title: 'Pending Admissions', 
                value: (dashboardData?.overview?.pendingStudents || 0).toLocaleString(), 
                icon: <HourglassEmpty />, 
                color: '#f59e0b', 
                subtitle: 'Awaiting completion / review' 
              }
            ].map((stat, i) => (
              <StatCard compact key={i} {...stat} />
            ))}
          </Box>


          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
            {/* Area Chart: Fee Collection Trend */}
            <Grid item xs={12} lg={7} size={{ xs: 12, lg: 7 }} sx={{ width: '100%' }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Fee Collection Trend
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cleared collections trend over the selected period
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300 }}>
                  {formattedTrendData.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No transactions recorded for the selected period.
                      </Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={formattedTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="feeCollectionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="formattedDate" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Collections']}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#feeCollectionGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Pie Chart: Student Distribution by Campus */}
            <Grid item xs={12} lg={5} size={{ xs: 12, lg: 5 }} sx={{ width: '100%' }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Student Distribution
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active student distribution across campuses
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {studentDistributionData.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No active student data.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ height: 230 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={studentDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {studentDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(value) => [`${value} Active Students`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 2 }}>
                        {studentDistributionData.map((entry, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <Typography variant="caption" fontWeight="600" color="text.secondary">
                              {entry.name} ({entry.value})
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Bar Chart: Campus Comparison */}
            <Grid item xs={12} size={{ xs: 12 }} sx={{ width: '100%' }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Campus-wise Financial Comparison
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Comparing fees generated, collected, and outstanding dues side-by-side
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300 }}>
                  {campusChartData.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No financial comparison data available.
                      </Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={campusChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 600, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          formatter={(value) => [`Rs. ${value.toLocaleString()}`]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                        <Bar dataKey="Billed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Campus Breakdown & Reports */}
          {dashboardData?.campusBreakdown && dashboardData.campusBreakdown.length > 0 && (() => {
            const displayCampuses = dashboardData.campusBreakdown.filter(c => 
              selectedCampus === 'all' || c._id === selectedCampus
            );

            // Grand totals for Admission Register
            const totalAdmissionsGrand = displayCampuses.reduce((sum, c) => sum + (c.totalAdmissions || c.totalStudents || 0), 0);
            const enrolledGrand = displayCampuses.reduce((sum, c) => sum + (c.enrolled ?? c.activeStudents ?? 0), 0);
            const stuckoffGrand = displayCampuses.reduce((sum, c) => sum + (c.struckoff ?? c.struckOffStudents ?? 0), 0);
            const pendingGrand = displayCampuses.reduce((sum, c) => sum + (c.pending ?? c.pendingStudents ?? 0), 0);

            // Grand totals for All Campus Receivable Report
            const finStudentsGrand = displayCampuses.reduce((sum, c) => sum + (c.activeStudents ?? c.enrolled ?? c.totalStudents ?? 0), 0);
            const finArrearsGrand = displayCampuses.reduce((sum, c) => sum + (c.arrears ?? c.previousReceivable ?? 0), 0);
            const finVouchersGrand = displayCampuses.reduce((sum, c) => {
              const v = c.vouchers !== undefined ? c.vouchers : Math.max(0, (c.feesGenerated || 0) - (c.previousReceivable || 0));
              return sum + v;
            }, 0);
            const finGrandTotalGrand = displayCampuses.reduce((sum, c) => {
              const v = c.vouchers !== undefined ? c.vouchers : Math.max(0, (c.feesGenerated || 0) - (c.previousReceivable || 0));
              const arr = c.arrears ?? c.previousReceivable ?? 0;
              return sum + (c.grandTotal ?? (v + arr));
            }, 0);
            const finReceivedGrand = displayCampuses.reduce((sum, c) => sum + (c.received ?? c.feesCollected ?? 0), 0);
            const finBalanceGrand = displayCampuses.reduce((sum, c) => {
              const v = c.vouchers !== undefined ? c.vouchers : Math.max(0, (c.feesGenerated || 0) - (c.previousReceivable || 0));
              const arr = c.arrears ?? c.previousReceivable ?? 0;
              const gt = c.grandTotal ?? (v + arr);
              const rec = c.received ?? c.feesCollected ?? 0;
              return sum + (c.balance ?? Math.max(0, gt - rec));
            }, 0);

            return (
              <Box sx={{ mb: 4 }}>
                <style>{`
                  @media print {
                    body * { visibility: hidden !important; }
                    #admission-register-printable, #admission-register-printable *,
                    #banks-statement-printable, #banks-statement-printable *,
                    #campus-financial-printable, #campus-financial-printable * { visibility: visible !important; }
                    #admission-register-printable, #banks-statement-printable, #campus-financial-printable { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
                    .no-print { display: none !important; }
                  }
                `}</style>

                {/* Report Tabs */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }} className="no-print">
                  <Tabs
                    value={activeReportTab}
                    onChange={(e, val) => setActiveReportTab(val)}
                    sx={{
                      bgcolor: '#f1f5f9',
                      p: 0.5,
                      borderRadius: 3,
                      '& .MuiTabs-indicator': { display: 'none' },
                      '& .MuiTab-root': {
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        minHeight: 40,
                        py: 1,
                        px: 2.5,
                        color: '#64748b',
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          bgcolor: '#ffffff',
                          color: '#6366f1',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
                        }
                      }
                    }}
                  >
                    <Tab icon={<School sx={{ fontSize: 18 }} />} iconPosition="start" label="Admission Register Report" value="admissions" />
                    <Tab icon={<Assessment sx={{ fontSize: 18 }} />} iconPosition="start" label="All Campus Receivable Report" value="financial" />
                    <Tab icon={<AccountBalance sx={{ fontSize: 18 }} />} iconPosition="start" label="Banks Statement Report" value="banks" />
                    <Tab icon={<TableChart sx={{ fontSize: 18 }} />} iconPosition="start" label="View All Reports" value="both" />
                  </Tabs>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', maxWidth: '100%' }}>
                  {/* Table 1: Admission Register Report */}
                  {(activeReportTab === 'admissions' || activeReportTab === 'both') && (
                    <Paper 
                      id="admission-register-printable"
                      elevation={0} 
                      sx={{ 
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        p: { xs: 2, sm: 3 }, 
                        borderRadius: 4, 
                        border: '1px solid #edf2f7', 
                        bgcolor: '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                        pb: 3
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 6, height: 22, bgcolor: '#8b5cf6', borderRadius: 1 }} />
                            Admission Register Report
                            <Chip 
                              label={`${displayCampuses.length} Campuses`} 
                              size="small" 
                              sx={{ bgcolor: '#8b5cf615', color: '#8b5cf6', fontWeight: 800, ml: 1, border: '1px solid #8b5cf630' }} 
                            />
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2.5, display: 'block', mt: 0.5 }}>
                            Campus-wise consolidated student admissions, enrolled strength, stuck off, and pending counts
                          </Typography>
                        </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }} className="no-print">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<FileDownload />}
                              onClick={handleExportAdmissionRegister}
                              sx={{
                                bgcolor: '#10b981',
                                '&:hover': { bgcolor: '#059669' },
                                borderRadius: 2.5,
                                textTransform: 'none',
                                fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                px: 2,
                                py: 0.8
                              }}
                            >
                              Export Excel
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Print />}
                              onClick={handlePrintAdmissionRegister}
                              sx={{
                                borderRadius: 2.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#64748b',
                                borderColor: '#e2e8f0',
                                '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                                px: 2,
                                py: 0.8
                              }}
                            >
                              Print
                            </Button>
                          </Box>
                        </Box>

                        <Box sx={{ overflowX: 'auto', width: '100%' }}>
                          <table style={{ width: '100%', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, width: '70px', textAlign: 'center' }}>S. #</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800 }}>Campus</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center' }}>Total Admissions</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center' }}>Enrolled</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center' }}>Stuckoff</th>
                                <th style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center' }}>Pending</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayCampuses.map((campus, idx) => {
                                const total = campus.totalAdmissions || campus.totalStudents || 0;
                                const enrolled = campus.enrolled ?? campus.activeStudents ?? 0;
                                const stuckoff = campus.struckoff ?? campus.struckOffStudents ?? 0;
                                const pending = campus.pending ?? campus.pendingStudents ?? 0;

                                return (
                                  <tr 
                                    key={campus._id || idx} 
                                    style={{ 
                                      borderBottom: '1px solid #f1f5f9', 
                                      transition: 'background-color 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                                      {idx + 1}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Chip 
                                          label={campus.code} 
                                          size="small" 
                                          variant="outlined" 
                                          color="primary" 
                                          sx={{ fontWeight: 800, fontSize: '0.75rem' }} 
                                        />
                                        <Typography variant="body2" fontWeight="700" color="#1e293b">
                                          {campus.name}
                                        </Typography>
                                      </Box>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                                      {total.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                      <Chip 
                                        label={enrolled.toLocaleString()} 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: '#10b98115', 
                                          color: '#059669', 
                                          fontWeight: 800, 
                                          fontSize: '0.85rem',
                                          minWidth: '50px',
                                          border: '1px solid #10b98130'
                                        }} 
                                      />
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                      <Chip 
                                        label={stuckoff.toLocaleString()} 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: stuckoff > 0 ? '#ef444415' : '#f1f5f9', 
                                          color: stuckoff > 0 ? '#dc2626' : '#94a3b8', 
                                          fontWeight: 800, 
                                          fontSize: '0.85rem',
                                          minWidth: '45px',
                                          border: stuckoff > 0 ? '1px solid #ef444430' : 'none'
                                        }} 
                                      />
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                      <Chip 
                                        label={pending.toLocaleString()} 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: pending > 0 ? '#f59e0b15' : '#f1f5f9', 
                                          color: pending > 0 ? '#d97706' : '#94a3b8', 
                                          fontWeight: 800, 
                                          fontSize: '0.85rem',
                                          minWidth: '45px',
                                          border: pending > 0 ? '1px solid #f59e0b30' : 'none'
                                        }} 
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>
                                  -
                                </td>
                                <td style={{ padding: '16px', fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                  Grand total
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 900, color: '#1e293b', fontSize: '1.05rem' }}>
                                  {totalAdmissionsGrand.toLocaleString()}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 900, color: '#059669', fontSize: '1.05rem' }}>
                                  {enrolledGrand.toLocaleString()}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 900, color: '#dc2626', fontSize: '1.05rem' }}>
                                  {stuckoffGrand.toLocaleString()}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 900, color: '#d97706', fontSize: '1.05rem' }}>
                                  {pendingGrand.toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </Box>
                      </Paper>
                  )}

                  {/* Table 2: All Campus Receivable Report */}
                  {(activeReportTab === 'financial' || activeReportTab === 'both') && (
                    <Paper 
                      id="campus-financial-printable"
                      elevation={0} 
                      sx={{ 
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        p: { xs: 2, sm: 3 }, 
                        borderRadius: 4, 
                        border: '1px solid #edf2f7', 
                        pb: 3, 
                        bgcolor: '#ffffff', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)' 
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 6, height: 22, bgcolor: '#6366f1', borderRadius: 1 }} />
                            All Campus Receivable Report
                            <Chip 
                              label={`${displayCampuses.length} Campuses`} 
                              size="small" 
                              sx={{ bgcolor: '#6366f115', color: '#6366f1', fontWeight: 800, ml: 1, border: '1px solid #6366f130' }} 
                            />
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2.5, display: 'block', mt: 0.5 }}>
                            Consolidated campus-wise fee vouchers, arrears, grand total billing, collections, and balance
                            {receivableFilterType === 'date' ? (
                              <span style={{ color: '#059669', fontWeight: 700, marginLeft: '8px' }}>
                                • Filter: Payment Dates ({receivablePaymentStart || 'Start'} to {receivablePaymentEnd || 'End'})
                              </span>
                            ) : (
                              <span style={{ color: '#6366f1', fontWeight: 700, marginLeft: '8px' }}>
                                • Filter: Billing Month ({receivableMonth || 'Current'})
                              </span>
                            )}
                          </Typography>
                        </Box>

                        {/* Export & Print on Right Side (matching Admission Register Report) */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }} className="no-print">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<FileDownload />}
                            onClick={handleExportFinancialReport}
                            sx={{
                              bgcolor: '#10b981',
                              '&:hover': { bgcolor: '#059669' },
                              borderRadius: 2.5,
                              textTransform: 'none',
                              fontWeight: 700,
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                              px: 2,
                              py: 0.8
                            }}
                          >
                            Export Excel
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Print />}
                            onClick={handlePrintFinancialReport}
                            sx={{
                              borderRadius: 2.5,
                              textTransform: 'none',
                              fontWeight: 600,
                              color: '#64748b',
                              borderColor: '#e2e8f0',
                              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                              px: 2,
                              py: 0.8
                            }}
                          >
                            Print
                          </Button>
                        </Box>
                      </Box>

                      {/* Filter Controls Row */}
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 3 }} className="no-print">
                        {/* Filter Mode Toggle */}
                        <ToggleButtonGroup
                          value={receivableFilterType}
                          exclusive
                          onChange={(e, next) => {
                            if (next) {
                              setReceivableFilterType(next);
                              if (next === 'date' && (!receivablePaymentStart || !receivablePaymentEnd)) {
                                const d = new Date();
                                setReceivablePaymentStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
                                setReceivablePaymentEnd(d.toISOString().split('T')[0]);
                              }
                              if (next === 'month' && !receivableMonth) {
                                const d = new Date();
                                setReceivableMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                              }
                            }
                          }}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            p: '3px',
                            borderRadius: 2.5,
                            '& .MuiToggleButton-root': {
                              border: 'none',
                              borderRadius: 2,
                              px: 1.5,
                              py: 0.5,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'none',
                              color: '#64748b',
                              '&.Mui-selected': {
                                bgcolor: '#ffffff',
                                color: '#6366f1',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                              }
                            }
                          }}
                        >
                          <ToggleButton value="month">Billing Month</ToggleButton>
                          <ToggleButton value="date">Payment Date</ToggleButton>
                        </ToggleButtonGroup>

                        {/* Month Filter */}
                        <TextField
                          size="small"
                          type="month"
                          label="Billing Month"
                          value={receivableMonth}
                          disabled={receivableFilterType === 'date'}
                          onChange={(e) => setReceivableMonth(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ 
                            width: 155,
                            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                            ...(receivableFilterType === 'date' && { opacity: 0.55 })
                          }}
                        />

                        {/* Payment Date From */}
                        <TextField
                          size="small"
                          type="date"
                          label="Payment From"
                          value={receivablePaymentStart}
                          disabled={receivableFilterType === 'month'}
                          onChange={(e) => setReceivablePaymentStart(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ 
                            width: 155,
                            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                            ...(receivableFilterType === 'month' && { opacity: 0.55 })
                          }}
                        />

                        {/* Payment Date To */}
                        <TextField
                          size="small"
                          type="date"
                          label="Payment To"
                          value={receivablePaymentEnd}
                          disabled={receivableFilterType === 'month'}
                          onChange={(e) => setReceivablePaymentEnd(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ 
                            width: 155,
                            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                            ...(receivableFilterType === 'month' && { opacity: 0.55 })
                          }}
                        />

                        {(receivableFilterType === 'month' ? receivableMonth : (receivablePaymentStart || receivablePaymentEnd)) && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              if (receivableFilterType === 'month') {
                                setReceivableMonth('');
                              } else {
                                setReceivablePaymentStart('');
                                setReceivablePaymentEnd('');
                              }
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}
                          >
                            Reset
                          </Button>
                        )}
                      </Box>
                      <Box sx={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #0f172a' }}>
                                <th 
                                  colSpan={8} 
                                  style={{ 
                                    padding: '12px 14px', 
                                    color: '#0f172a', 
                                    fontSize: '1.15rem', 
                                    fontWeight: 900, 
                                    textAlign: 'center',
                                    letterSpacing: '0.5px',
                                    border: '1px solid #cbd5e1'
                                  }}
                                >
                                  <div>All Campus Receiveable Report</div>
                                  {receivableFilterType === 'date' ? (
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', marginTop: '4px' }}>
                                      Payment Date Range: {receivablePaymentStart || 'Start'} to {receivablePaymentEnd || 'End'}
                                    </div>
                                  ) : receivableMonth ? (
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1', marginTop: '4px' }}>
                                      Billing Month: {receivableMonth}
                                    </div>
                                  ) : null}
                                </th>
                              </tr>
                              <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, width: '60px', textAlign: 'center' }}>S. #</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 16px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800 }}>Campus</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center' }}>No. of Students</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>{getVouchersHeader()}</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>Arears</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>Grand Total</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>Received</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '12px 14px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right' }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayCampuses.map((campus, idx) => {
                                const students = campus.activeStudents ?? campus.enrolled ?? campus.totalStudents ?? 0;
                                const arrears = campus.arrears ?? (campus.previousReceivable || 0);
                                const vouchers = campus.vouchers !== undefined ? campus.vouchers : Math.max(0, (campus.feesGenerated || 0) - (campus.previousReceivable || 0));
                                const grandTotal = campus.grandTotal ?? (vouchers + arrears);
                                const received = campus.received ?? (campus.feesCollected || 0);
                                const balance = campus.balance ?? Math.max(0, grandTotal - received);

                                return (
                                  <tr 
                                    key={campus._id || idx} 
                                    style={{ 
                                      borderBottom: '1px solid #e2e8f0', 
                                      transition: 'background-color 0.2s ease' 
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                                      {idx + 1}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {campus.code && (
                                          <Chip 
                                            label={campus.code} 
                                            size="small" 
                                            variant="outlined" 
                                            color="primary" 
                                            sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22 }} 
                                          />
                                        )}
                                        <span>{campus.name}</span>
                                      </Box>
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                                      {students.toLocaleString()}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#4338ca' }}>
                                      {vouchers.toLocaleString()}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                                      {arrears.toLocaleString()}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                      {grandTotal.toLocaleString()}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                      {received.toLocaleString()}
                                    </td>
                                    <td style={{ border: '1px solid #e2e8f0', padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: balance > 0 ? '#d97706' : '#059669' }}>
                                      {balance.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ backgroundColor: '#ffffff', borderTop: '2px solid #0f172a', borderBottom: '3px double #0f172a' }}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>
                                  -
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px 16px', fontWeight: 900, color: '#0f172a', fontSize: '1rem', textDecoration: 'underline' }}>
                                  total
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'center', fontWeight: 900, color: '#0f172a', fontSize: '1rem', textDecoration: 'underline' }}>
                                  {finStudentsGrand.toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1rem', textDecoration: 'underline' }}>
                                  {finVouchersGrand.toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1rem', textDecoration: 'underline' }}>
                                  {finArrearsGrand.toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.05rem', textDecoration: 'underline' }}>
                                  {finGrandTotalGrand.toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1rem', textDecoration: 'underline' }}>
                                  {finReceivedGrand.toLocaleString()}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '14px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.05rem', textDecoration: 'underline' }}>
                                  {finBalanceGrand.toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </Box>
                      </Paper>
                  )}

                  {/* Table 3: Banks Statement Report */}
                  {(activeReportTab === 'banks' || activeReportTab === 'both') && (
                    <Paper 
                      id="banks-statement-printable"
                      elevation={0} 
                      sx={{ 
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        p: { xs: 2, sm: 3 }, 
                        borderRadius: 4, 
                        border: '1px solid #edf2f7', 
                        bgcolor: '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                        pb: 3
                      }}
                    >
                      {/* Header & Controls */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 6, height: 22, bgcolor: '#0ea5e9', borderRadius: 1 }} />
                            Banks Statement Report
                              {bankReportData && (
                                <>
                                  <Chip 
                                    label={`${bankReportData.rows?.length || 0} Accounts`} 
                                    size="small" 
                                    sx={{ bgcolor: '#0ea5e915', color: '#0284c7', fontWeight: 800, ml: 1, border: '1px solid #0ea5e930' }} 
                                  />
                                  <Chip 
                                    label={`${bankReportData.campuses?.length || 0} Campuses`} 
                                    size="small" 
                                    sx={{ bgcolor: '#10b98115', color: '#059669', fontWeight: 800, border: '1px solid #10b98130' }} 
                                  />
                                </>
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2.5, display: 'block', mt: 0.5 }}>
                              Consolidated multi-campus bank statements, collections, and account totals at one place
                              {bankFilterType === 'date' ? (
                                <span style={{ color: '#0284c7', fontWeight: 700, marginLeft: '8px' }}>
                                  • Filter: Payment Dates ({bankPaymentStart || 'Start'} to {bankPaymentEnd || 'End'})
                                </span>
                              ) : (
                                <span style={{ color: '#059669', fontWeight: 700, marginLeft: '8px' }}>
                                  • Filter: Billing Month ({bankReportMonth || 'Current'})
                                </span>
                              )}
                            </Typography>
                          </Box>

                          {/* Export & Print on Right Side (matching Admission Register Report) */}
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }} className="no-print">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<FileDownload />}
                              onClick={handleExportBanksStatementReport}
                              disabled={!bankReportData || bankReportData.rows?.length === 0}
                              sx={{
                                bgcolor: '#10b981',
                                '&:hover': { bgcolor: '#059669' },
                                borderRadius: 2.5,
                                textTransform: 'none',
                                fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                px: 2,
                                py: 0.8
                              }}
                            >
                              Export Excel
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Print />}
                              onClick={() => window.print()}
                              sx={{
                                borderRadius: 2.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#64748b',
                                borderColor: '#e2e8f0',
                                '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                                px: 2,
                                py: 0.8
                              }}
                            >
                              Print
                            </Button>
                          </Box>
                        </Box>

                        {/* Filter Controls Row */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 3 }} className="no-print">
                          {/* Filter Mode Toggle */}
                          <ToggleButtonGroup
                            value={bankFilterType}
                            exclusive
                            onChange={(e, next) => {
                              if (next) {
                                setBankFilterType(next);
                                if (next === 'date' && (!bankPaymentStart || !bankPaymentEnd)) {
                                  const d = new Date();
                                  setBankPaymentStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
                                  setBankPaymentEnd(d.toISOString().split('T')[0]);
                                }
                                if (next === 'month' && !bankReportMonth) {
                                  const d = new Date();
                                  setBankReportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                                }
                              }
                            }}
                            size="small"
                            sx={{
                              bgcolor: '#f1f5f9',
                              p: '3px',
                              borderRadius: 2.5,
                              '& .MuiToggleButton-root': {
                                border: 'none',
                                borderRadius: 2,
                                px: 1.5,
                                py: 0.5,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                color: '#64748b',
                                '&.Mui-selected': {
                                  bgcolor: '#ffffff',
                                  color: '#0284c7',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                                }
                              }
                            }}
                          >
                            <ToggleButton value="month">Billing Month</ToggleButton>
                            <ToggleButton value="date">Payment Date</ToggleButton>
                          </ToggleButtonGroup>

                          {/* Month Filter */}
                          <TextField
                            size="small"
                            type="month"
                            label="Billing Month"
                            value={bankReportMonth}
                            disabled={bankFilterType === 'date'}
                            onChange={(e) => setBankReportMonth(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ 
                              width: 155,
                              '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                              ...(bankFilterType === 'date' && { opacity: 0.55 })
                            }}
                          />

                          {/* Payment Date From Filter */}
                          <TextField
                            size="small"
                            type="date"
                            label="Payment From"
                            value={bankPaymentStart}
                            disabled={bankFilterType === 'month'}
                            onChange={(e) => setBankPaymentStart(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ 
                              width: 155,
                              '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                              ...(bankFilterType === 'month' && { opacity: 0.55 })
                            }}
                          />

                          {/* Payment Date To Filter */}
                          <TextField
                            size="small"
                            type="date"
                            label="Payment To"
                            value={bankPaymentEnd}
                            disabled={bankFilterType === 'month'}
                            onChange={(e) => setBankPaymentEnd(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ 
                              width: 155,
                              '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                              ...(bankFilterType === 'month' && { opacity: 0.55 })
                            }}
                          />

                          {(bankFilterType === 'month' ? bankReportMonth : (bankPaymentStart || bankPaymentEnd)) && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                if (bankFilterType === 'month') {
                                  setBankReportMonth('');
                                } else {
                                  setBankPaymentStart('');
                                  setBankPaymentEnd('');
                                }
                              }}
                              sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}
                            >
                              Reset
                            </Button>
                          )}
                        </Box>

                        {/* Report Content */}
                        {bankReportLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                            <CircularProgress size={36} sx={{ color: '#0ea5e9' }} />
                          </Box>
                        ) : !bankReportData || bankReportData.rows?.length === 0 ? (
                          <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                            No bank statement or payment collection records found for the selected period.
                          </Alert>
                        ) : (
                          <Box sx={{ overflowX: 'auto', width: '100%', mt: 1 }}>
                            {/* Table Banner Title */}
                            <Box 
                              sx={{ 
                                width: '100%',
                                boxSizing: 'border-box',
                                textAlign: 'center', 
                                py: 1.2, 
                                bgcolor: '#f8fafc', 
                                border: '1px solid #1e293b', 
                                borderBottom: 'none' 
                              }}
                            >
                              <Typography variant="h6" fontWeight="900" sx={{ color: '#000000', letterSpacing: 0.5, fontSize: '1.15rem' }}>
                                Banks Statement Report
                              </Typography>
                              {bankFilterType === 'date' ? (
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#0284c7' }}>
                                  Payment Date Range: {bankPaymentStart || 'Start'} to {bankPaymentEnd || 'End'}
                                </Typography>
                              ) : bankReportMonth ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                                  Billing Month: {new Date(bankReportMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </Typography>
                              ) : null}
                            </Box>

                            {/* Main Matrix Table */}
                            <table style={{ width: '100%', minWidth: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #1e293b' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#ffffff' }}>
                                  <th rowSpan={2} style={{ border: '1px solid #1e293b', padding: '10px 8px', fontSize: '0.85rem', fontWeight: 900, width: '50px', color: '#000000', verticalAlign: 'middle' }}>
                                    S. #
                                  </th>
                                  <th rowSpan={2} style={{ border: '1px solid #1e293b', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 900, color: '#000000', verticalAlign: 'middle', minWidth: '160px' }}>
                                    Banks / Campus
                                  </th>
                                  {bankReportData.campuses.map(campus => (
                                    <th key={campus._id} colSpan={2} style={{ border: '1px solid #1e293b', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 900, color: '#000000' }}>
                                      {campus.name}
                                    </th>
                                  ))}
                                  <th colSpan={2} style={{ border: '1px solid #1e293b', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 900, color: '#000000' }}>
                                    Total
                                  </th>
                                  <th rowSpan={2} style={{ border: '1px solid #1e293b', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 900, width: '120px', color: '#000000', verticalAlign: 'middle' }}>
                                    Group Total
                                  </th>
                                </tr>
                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                  {bankReportData.campuses.map(campus => (
                                    <React.Fragment key={campus._id}>
                                      <th style={{ border: '1px solid #1e293b', padding: '6px 8px', fontSize: '0.78rem', fontWeight: 800, color: '#059669', backgroundColor: '#f0fdf4', minWidth: '85px' }}>
                                        Reconciled
                                      </th>
                                      <th style={{ border: '1px solid #1e293b', padding: '6px 8px', fontSize: '0.78rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbeb', minWidth: '85px' }}>
                                        Suspense
                                      </th>
                                    </React.Fragment>
                                  ))}
                                  <th style={{ border: '1px solid #1e293b', padding: '6px 8px', fontSize: '0.78rem', fontWeight: 800, color: '#059669', backgroundColor: '#f0fdf4', minWidth: '85px' }}>
                                    Reconciled
                                  </th>
                                  <th style={{ border: '1px solid #1e293b', padding: '6px 8px', fontSize: '0.78rem', fontWeight: 800, color: '#d97706', backgroundColor: '#fffbeb', minWidth: '85px' }}>
                                    Suspense
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {bankReportData.groups.map(group => {
                                  const groupRows = bankReportData.rows.filter(r => r.groupKey === group.groupKey);
                                  return (
                                    <React.Fragment key={group.groupKey}>
                                      {groupRows.map((row) => (
                                        <tr 
                                          key={row.bankAccountId}
                                          style={{ backgroundColor: '#ffffff' }}
                                        >
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 700, color: '#000000' }}>
                                            {row.sNo}
                                          </td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 14px', fontWeight: 700, color: '#000000', textAlign: 'left' }}>
                                            {row.bankName}
                                          </td>
                                          {bankReportData.campuses.map(campus => {
                                            const campData = row.campusAmounts?.[campus._id];
                                            const recVal = campData?.reconciled;
                                            const suspVal = campData?.suspense;
                                            return (
                                              <React.Fragment key={campus._id}>
                                                <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 600, color: '#059669', textAlign: 'right' }}>
                                                  {recVal !== undefined && recVal !== null 
                                                    ? (recVal === 0 && row.rowTotal > 0 && group.accountsCount > 1 
                                                        ? '0' 
                                                        : (recVal > 0 ? recVal.toLocaleString() : '')) 
                                                    : ''}
                                                </td>
                                                <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 600, color: '#d97706', textAlign: 'right' }}>
                                                  {suspVal !== undefined && suspVal !== null && suspVal > 0 
                                                    ? suspVal.toLocaleString() 
                                                    : ''}
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                                            {(row.rowReconciledTotal || 0) > 0 ? (row.rowReconciledTotal || 0).toLocaleString() : ''}
                                          </td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 700, color: '#d97706', textAlign: 'right' }}>
                                            {(row.rowSuspenseTotal || 0) > 0 ? (row.rowSuspenseTotal || 0).toLocaleString() : ''}
                                          </td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 14px', fontWeight: 700, color: '#000000', textAlign: 'right' }}>
                                            {row.groupTotal !== null && row.groupTotal !== undefined ? row.groupTotal.toLocaleString() : ''}
                                          </td>
                                        </tr>
                                      ))}

                                      {/* Subtotal Row for multi-account bank groups */}
                                      {group.hasMultipleAccounts && (
                                        <tr style={{ backgroundColor: '#ffffff' }}>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px' }}></td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 14px', fontWeight: 800, color: '#000000', textAlign: 'left' }}>
                                            {group.subtotalLabel || `${group.groupKey} Main G.total`}
                                          </td>
                                          {bankReportData.campuses.map(campus => {
                                            const gCamp = group.campusTotals?.[campus._id];
                                            const gRec = typeof gCamp === 'object' ? gCamp?.reconciled : gCamp;
                                            const gSusp = typeof gCamp === 'object' ? gCamp?.suspense : 0;
                                            return (
                                              <React.Fragment key={campus._id}>
                                                <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 800, color: '#059669', textAlign: 'right' }}>
                                                  {gRec > 0 ? gRec.toLocaleString() : ''}
                                                </td>
                                                <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 800, color: '#d97706', textAlign: 'right' }}>
                                                  {gSusp > 0 ? gSusp.toLocaleString() : ''}
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 800, color: '#059669', textAlign: 'right' }}>
                                            {(group.reconciledTotal || 0) > 0 ? (group.reconciledTotal || 0).toLocaleString() : ''}
                                          </td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 800, color: '#d97706', textAlign: 'right' }}>
                                            {(group.suspenseTotal || 0) > 0 ? (group.suspenseTotal || 0).toLocaleString() : ''}
                                          </td>
                                          <td style={{ border: '1px solid #1e293b', padding: '9px 14px', fontWeight: 800, color: '#000000', textAlign: 'right' }}>
                                            {(group.total || 0).toLocaleString()}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ backgroundColor: '#ffffff' }}>
                                  <td style={{ border: '1px solid #1e293b', padding: '11px 8px' }}></td>
                                  <td style={{ border: '1px solid #1e293b', padding: '11px 14px', fontWeight: 900, textDecoration: 'underline', color: '#000000', fontSize: '0.95rem', textAlign: 'left' }}>
                                    Grand Total
                                  </td>
                                  {bankReportData.campuses.map(campus => {
                                    const cTotals = bankReportData.grandTotals?.campusTotals?.[campus._id];
                                    const cRec = typeof cTotals === 'object' ? cTotals?.reconciled : cTotals;
                                    const cSusp = typeof cTotals === 'object' ? cTotals?.suspense : 0;
                                    return (
                                      <React.Fragment key={campus._id}>
                                        <td style={{ border: '1px solid #1e293b', padding: '11px 8px', fontWeight: 900, color: '#059669', fontSize: '0.9rem', textAlign: 'right' }}>
                                          {(cRec || 0).toLocaleString()}
                                        </td>
                                        <td style={{ border: '1px solid #1e293b', padding: '11px 8px', fontWeight: 900, color: '#d97706', fontSize: '0.9rem', textAlign: 'right' }}>
                                          {(cSusp || 0).toLocaleString()}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}
                                  <td style={{ border: '1px solid #1e293b', padding: '11px 8px', fontWeight: 900, color: '#059669', fontSize: '0.9rem', textAlign: 'right' }}>
                                    {(bankReportData.grandTotals?.reconciledTotal || 0).toLocaleString()}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '11px 8px', fontWeight: 900, color: '#d97706', fontSize: '0.9rem', textAlign: 'right' }}>
                                    {(bankReportData.grandTotals?.suspenseTotal || 0).toLocaleString()}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '11px 14px', fontWeight: 900, textDecoration: 'underline', color: '#000000', fontSize: '1.05rem', textAlign: 'right' }}>
                                    {(bankReportData.grandTotals?.total || 0).toLocaleString()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </Box>
                        )}
                      </Paper>
                  )}
                </Box>
              </Box>
            );
          })()}
        </>
      )}
    </Box>
  );
};

export default FinanceDashboard;
