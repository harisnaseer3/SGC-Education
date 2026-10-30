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
  IconButton,
  Card,
  CardContent,
  Autocomplete
} from '@mui/material';
import { 
  Search,
  Print as PrintIcon, 
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { 
  getInstitutionId, 
  createAxiosConfig,
  exportToExcelWithBoldHeaders
} from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const StudentLedgerReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutionData, setInstitutionData] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [currentInstitutionId, setCurrentInstitutionId] = useState(() => {
    return getInstitutionId(user, user.role === 'super_admin');
  });

  const [filters, setFilters] = useState({
    institution: currentInstitutionId || '',
    classId: '',
    studentId: null,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const handleInstChange = () => {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const id = getInstitutionId(u, u.role === 'super_admin');
      setCurrentInstitutionId(id);
    };

    window.addEventListener('institutionChanged', handleInstChange);
    window.addEventListener('storage', handleInstChange);
    return () => {
      window.removeEventListener('institutionChanged', handleInstChange);
      window.removeEventListener('storage', handleInstChange);
    };
  }, []);

  useEffect(() => {
    setFilters(prev => ({ ...prev, institution: currentInstitutionId }));
    if (currentInstitutionId) {
      fetchInstitutionData(currentInstitutionId);
      fetchClasses(currentInstitutionId);
    }
  }, [currentInstitutionId]);

  const fetchInstitutionData = async (instId) => {
    try {
      const response = await axios.get(`${API_URL}/institutions/${instId}`, createAxiosConfig());
      setInstitutionData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institution data', err);
    }
  };

  const fetchClasses = async (instId) => {
    try {
      const params = { isActive: true };
      if (instId) params.institution = instId;
      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig({ params }));
      const rawClasses = response.data.data || [];
      const uniqueMap = new Map();
      rawClasses.forEach(c => {
        if (c.name && !uniqueMap.has(c.name)) {
          uniqueMap.set(c.name, c);
        }
      });
      setClasses(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to fetch classes', err);
    }
  };

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Live search for students
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents(filters.classId, searchTerm);
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filters.classId, filters.institution]);

  const fetchStudents = async (classId, query = '') => {
    // Only fetch students if a class is selected or a search query is provided
    if (!query && !classId) {
      setStudents([]);
      return;
    }
    
    try {
        setSearchLoading(true);
        const params = { status: 'enrolled' };
        if (filters.institution) params.institution = filters.institution;
        if (classId && classId !== 'all') params.class = classId;
        if (query) params.search = query;

        const response = await axios.get(`${API_URL}/admissions`, createAxiosConfig({ params }));
        const resData = response.data.data;
        const list = resData?.admissions ? resData.admissions : (Array.isArray(resData) ? resData : []);
        setStudents(list);
        if (query && list.length > 0) {
          setFilters(prev => ({ ...prev, studentId: list[0] }));
        }
    } catch (err) {
        console.error('Failed to fetch students', err);
    } finally {
        setSearchLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const clsId = e.target.value;
    setFilters({ ...filters, classId: clsId, studentId: null });
    setReportData(null);
  };

  const handleGenerate = async () => {
    if (!filters.studentId) {
        alert("Please select a student to generate the ledger.");
        return;
    }

    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);

      const params = {
        institution: institutionId,
      };
      
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await axios.get(`${API_URL}/fees/student-ledger/${filters.studentId._id}`, createAxiosConfig({ params }));
      
      setReportData(response.data.data);
    } catch (err) {
      console.error('Failed to generate report', err);
      alert(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const { student, admissionFeeDetails = [], voucherRows = [], summary = {} } = reportData;
    
    const exportData = [];

    // Header info
    exportData.push({ 'Col1': institutionData?.name || 'TIGES - TAJ CAMPUS', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': '', 'Col8': '', 'Col9': '', 'Col10': '', 'Col11': '' });
    exportData.push({ 'Col1': institutionData?.address?.city || 'Rawalpindi', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': '', 'Col8': '', 'Col9': '', 'Col10': '', 'Col11': '' });
    exportData.push({ 'Col1': 'Student Ledger', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': '', 'Col8': '', 'Col9': '', 'Col10': '', 'Col11': '' });
    exportData.push({ 'Col1': `Complete details of student (${student.name}, ${student.fatherName || 'N/A'}, ${student.class}${student.section ? ` - ${student.section}` : ''}, Roll #: ${student.rollNumber || 'N/A'})`, 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': '', 'Col8': '', 'Col9': '', 'Col10': '', 'Col11': '' });
    exportData.push({ 'Col1': `Print Date: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': '', 'Col8': '', 'Col9': '', 'Col10': '', 'Col11': '' });
    exportData.push({});

    // Section 1: Detail At the time of admition
    exportData.push({ 'Col1': 'Detail At the time of admition', 'Col2': '', 'Col3': '', 'Col4': '' });
    exportData.push({ 'Col1': 'Fee Head', 'Col2': 'Base Amount', 'Col3': 'Discount', 'Col4': 'Final Amount' });
    let totalAdmissionFinal = 0;
    admissionFeeDetails.forEach(item => {
      totalAdmissionFinal += Number(item.finalAmount || 0);
      exportData.push({
        'Col1': item.feeHead,
        'Col2': item.baseAmount || 0,
        'Col3': item.discount || 0,
        'Col4': item.finalAmount || 0
      });
    });
    exportData.push({ 'Col1': 'Total', 'Col2': '', 'Col3': '', 'Col4': totalAdmissionFinal });
    exportData.push({});

    // Section 2: Vouchers Table
    exportData.push({
      'Col1': 'Voucher #',
      'Col2': 'Fee Month',
      'Col3': 'Issue Date:',
      'Col4': 'Current Month Fee',
      'Col5': 'Arears',
      'Col6': 'Total Paid',
      'Col7': 'Balance',
      'Col8': 'Paid Date',
      'Col9': 'Paid Status',
      'Col10': 'Bank',
      'Col11': 'FT #'
    });

    let sumCurrentMonthFee = 0;
    let sumPaid = 0;
    voucherRows.forEach(row => {
      sumCurrentMonthFee += Number(row.currentMonthFee || 0);
      sumPaid += Number(row.totalPaid || 0);
      exportData.push({
        'Col1': row.voucherNumber || '-',
        'Col2': row.feeMonth || '',
        'Col3': row.issueDate ? format(new Date(row.issueDate), 'd/M/yyyy') : '-',
        'Col4': row.currentMonthFee || 0,
        'Col5': row.arrears ? row.arrears : '',
        'Col6': row.totalPaid ? row.totalPaid : '',
        'Col7': row.balance !== undefined ? row.balance : 0,
        'Col8': row.paidDate ? format(new Date(row.paidDate), 'dd/MM/yyyy') : '',
        'Col9': row.paidStatus || 'Unpaid',
        'Col10': row.bank || '',
        'Col11': row.ftNumber || ''
      });
    });

    const finalBalance = voucherRows.length > 0 ? voucherRows[voucherRows.length - 1].balance : 0;
    exportData.push({
      'Col1': '',
      'Col2': 'Total',
      'Col3': '',
      'Col4': '',
      'Col5': '',
      'Col6': sumPaid,
      'Col7': finalBalance,
      'Col8': '',
      'Col9': '',
      'Col10': '',
      'Col11': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Ledger');
    XLSX.writeFile(workbook, `Student_Ledger_${student.enrollmentNumber || student.rollNumber || 'Report'}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = () => {
    if (!reportData) return null;
    const { student, admissionFeeDetails = [], voucherRows = [], summary = {} } = reportData;

    const totalAdmissionFinal = admissionFeeDetails.reduce((sum, item) => sum + Number(item.finalAmount || 0), 0);
    const sumPaid = voucherRows.reduce((sum, row) => sum + Number(row.totalPaid || 0), 0);
    const finalBalance = voucherRows.length > 0 ? voucherRows[voucherRows.length - 1].balance : 0;
    
    return (
      <Box sx={{ mt: 3, '@media print': { mt: 0 } }} className="printable-report">
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
              @page { size: landscape; margin: 8mm; }
              .no-print { display: none !important; }
            }
          `}
        </style>

        {/* Header matching screenshot */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            {institutionData?.name ? institutionData.name.toUpperCase() : 'TIGES - TAJ CAMPUS'}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.3 }}>
            {institutionData?.address?.city || 'Rawalpindi'}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
            Student Ledger
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
            Complete details of student ({student.name}, {student.fatherName || 'N/A'}, {student.class}{student.section ? ` - ${student.section}` : ''}, Roll #: {student.rollNumber || 'N/A'})
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Print Date: {format(new Date(), 'dd/MM/yyyy hh:mm a')}
          </Typography>
        </Box>

        {/* Section 1: Detail At the time of admition */}
        <Box sx={{ mb: 4, maxWidth: 500 }}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #000' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ bgcolor: '#f0f0f0', fontWeight: 'bold', borderBottom: '1px solid #000', py: 0.8 }}>
                    Detail At the time of admition
                  </TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #ccc', py: 0.5 }}>Fee Head</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #ccc', py: 0.5 }}>Base Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #ccc', py: 0.5 }}>Discount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5 }}>Final Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admissionFeeDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 1.5, color: 'text.secondary' }}>
                      No admission fee heads recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  admissionFeeDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ borderRight: '1px solid #eee', py: 0.4 }}>{item.feeHead}</TableCell>
                      <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.4 }}>
                        {item.baseAmount ? Number(item.baseAmount).toLocaleString() : '0'}
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.4 }}>
                        {item.discount ? Number(item.discount).toLocaleString() : '0'}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.4 }}>
                        {item.finalAmount !== undefined ? Number(item.finalAmount).toLocaleString() : '0'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow sx={{ bgcolor: '#f9f9f9', borderTop: '2px solid #000' }}>
                  <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #ccc', py: 0.5 }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5 }}>
                    {totalAdmissionFinal.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Section 2: Vouchers Ledger Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #000' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#d9d9d9' }}>
                <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Voucher #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Fee Month</TableCell>
                <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Issue Date:</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Current Month Fee</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Arears</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Total Paid</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Balance</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Paid Date</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Paid Statu</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.8 }}>Bank</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.8 }}>FT #</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voucherRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No fee vouchers or payments found for this student.
                  </TableCell>
                </TableRow>
              ) : (
                voucherRows.map((row, idx) => (
                  <TableRow key={row.id || idx} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                    <TableCell sx={{ borderRight: '1px solid #eee', py: 0.5 }}>{row.voucherNumber || '-'}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #eee', py: 0.5 }}>{row.feeMonth}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.issueDate ? format(new Date(row.issueDate), 'd/M/yyyy') : '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.currentMonthFee ? row.currentMonthFee.toLocaleString() : '0'}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.arrears ? row.arrears.toLocaleString() : ''}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.5, fontWeight: row.totalPaid > 0 ? 600 : 400 }}>
                      {row.totalPaid ? row.totalPaid.toLocaleString() : ''}
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid #eee', py: 0.5, fontWeight: 'bold' }}>
                      {row.balance !== undefined ? row.balance.toLocaleString() : 0}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.paidDate ? format(new Date(row.paidDate), 'dd/MM/yyyy') : ''}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.paidStatus}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid #eee', py: 0.5 }}>
                      {row.bank || ''}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 0.5 }}>
                      {row.ftNumber || ''}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Total Summary Row */}
              <TableRow sx={{ bgcolor: '#eee', borderTop: '2px solid #000' }}>
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell align="center" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.6 }}>Total</TableCell>
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.6 }}>
                  {sumPaid.toLocaleString()}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', borderRight: '1px solid #bfbfbf', py: 0.6 }}>
                  {finalBalance.toLocaleString()}
                </TableCell>
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell sx={{ borderRight: '1px solid #bfbfbf', py: 0.6 }} />
                <TableCell sx={{ py: 0.6 }} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box className="no-print">
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                select
                size="small"
                label="Class"
                value={filters.classId}
                onChange={handleClassChange}
                InputLabelProps={{
                  shrink: true
                }}
                SelectProps={{
                  displayEmpty: true
                }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((cls) => (
                  <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                disabled={searchLoading}
                label="Select Student"
                value={filters.studentId ? filters.studentId._id : ''}
                onChange={(e) => {
                  const selected = students.find(s => s._id === e.target.value);
                  setFilters({ ...filters, studentId: selected || null });
                  setReportData(null);
                }}
                InputLabelProps={{
                  shrink: true
                }}
                SelectProps={{
                  displayEmpty: true
                }}
              >
                <MenuItem value="">-- Select Student --</MenuItem>
                {students.map((std) => {
                  const name = std.name || std.firstName || std.personalDetails?.name || 'Unknown';
                  const rollNo = std.rollNumber ? `Roll: ${std.rollNumber}` : '';
                  const admNo = std.admissionNo || std.admissionNumber || std.applicationNumber || std.enrollmentNumber ? `Adm: ${std.admissionNo || std.admissionNumber || std.applicationNumber || std.enrollmentNumber}` : '';
                  const details = [rollNo, admNo].filter(Boolean).join(' | ');
                  return (
                    <MenuItem key={std._id} value={std._id}>
                      {name} {details ? `(${details})` : ''}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                label="Search Student"
                placeholder="Global Search (Name, Roll #, Adm #)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: searchLoading ? <CircularProgress color="inherit" size={18} /> : null
                }}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
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

            <Grid item xs={6} sm={3} md={1.5}>
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

            <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="contained" 
                onClick={handleGenerate}
                disabled={loading || !filters.studentId}
                sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, height: '40px', width: '100%' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <Search />}
              </Button>
            </Grid>

            {reportData && (
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                      color="primary"
                      startIcon={<PrintIcon />}
                      onClick={handlePrint}
                      sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                    >
                      PRINT
                    </Button>
                    <Button
                      variant="outlined"
                      color="success"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportExcel}
                      sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                    >
                      EXPORT
                    </Button>
                  </Box>
                 </Grid>
               )}
            </Grid>
          </Paper>
      </Box>

      {renderTable()}
    </Box>
  );
};

export default StudentLedgerReport;
