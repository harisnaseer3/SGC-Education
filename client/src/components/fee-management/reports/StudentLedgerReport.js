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
  const isSuperAdmin = user.role === 'super_admin';
  const currentInstitutionId = getInstitutionId(user, isSuperAdmin);

  const [filters, setFilters] = useState({
    institution: currentInstitutionId || '',
    classId: '',
    studentId: null,
    startDate: '',
    endDate: ''
  });

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
      const params = instId ? { institution: instId } : {};
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

    const { student, transactions, summary } = reportData;
    
    let exportData = transactions.map((row, idx) => ({
        'Date': format(new Date(row.date), 'dd/MM/yyyy'),
        'Type': row.type.toUpperCase(),
        'Reference': row.reference || '-',
        'Description': row.description,
        'Debit (+)': row.debit || 0,
        'Credit (-)': row.credit || 0,
        'Balance': row.balance || 0,
    }));

    // Add empty row
    exportData.push({'Date': '', 'Type': '', 'Reference': '', 'Description': '', 'Debit (+)': '', 'Credit (-)': '', 'Balance': ''});
    
    // Add summary row
    exportData.push({
        'Date': 'TOTAL',
        'Type': '',
        'Reference': '',
        'Description': '',
        'Debit (+)': summary.totalCharges,
        'Credit (-)': summary.totalPayments,
        'Balance': summary.currentBalance
    });

    exportToExcelWithBoldHeaders(
        XLSX, 
        exportData, 
        'Student Ledger', 
        `Student_Ledger_${student.enrollmentNumber}_${format(new Date(), 'yyyyMMdd')}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = () => {
    if (!reportData) return null;
    const { student, transactions, summary } = reportData;
    
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
              @page { size: portrait; margin: 10mm; }
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
                {institutionData?.name || 'Student Ledger Report'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {institutionData?.address?.city || ''} {institutionData?.address?.state || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" color="#667eea" fontWeight="bold">Student Ledger Account</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              Print Date: {format(new Date(), 'dd MMM yyyy hh:mm a')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 4, bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Box>
                <Typography variant="caption" color="text.secondary">Student Name</Typography>
                <Typography variant="body1" fontWeight="bold">{student.name}</Typography>
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary">Registration / Adm #</Typography>
                <Typography variant="body1" fontWeight="bold">{student.enrollmentNumber} / {student.admissionNumber}</Typography>
            </Box>
             <Box>
                <Typography variant="caption" color="text.secondary">Roll Number</Typography>
                <Typography variant="body1" fontWeight="bold">{student.rollNumber || 'N/A'}</Typography>
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary">Class & Section</Typography>
                <Typography variant="body1" fontWeight="bold">{student.class} {student.section ? `- ${student.section}` : ''}</Typography>
            </Box>
        </Box>

        <TableContainer component={Paper} sx={{ border: '1px solid #eee' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Debit (+)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit (-)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                {transactions.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>No transactions found for this student.</TableCell>
                    </TableRow>
                ) : (
                    transactions.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell>{format(new Date(row.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{row.reference || '-'}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell align="right" sx={{ color: row.debit > 0 ? 'error.main' : 'inherit' }}>
                            {row.debit ? row.debit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ color: row.credit > 0 ? 'success.main' : 'inherit' }}>
                            {row.credit ? row.credit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {row.balance.toLocaleString()}
                        </TableCell>
                    </TableRow>
                    ))
                )}
              
                <TableRow sx={{ bgcolor: '#eee' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>{summary.totalCharges.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{summary.totalPayments.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{summary.currentBalance.toLocaleString()}</TableCell>
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
        <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={filters.classId}
                    label="Class"
                    onChange={handleClassChange}
                  >
                    <MenuItem value=""><em>Select Class</em></MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small" disabled={searchLoading}>
                  <InputLabel>Select Student</InputLabel>
                  <Select
                    value={filters.studentId ? filters.studentId._id : ''}
                    label="Select Student"
                    onChange={(e) => {
                      const selected = students.find(s => s._id === e.target.value);
                      setFilters({ ...filters, studentId: selected || null });
                      setReportData(null);
                    }}
                  >
                    <MenuItem value=""><em>-- Select Student --</em></MenuItem>
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
                  </Select>
                </FormControl>
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

              <Grid item xs={6} md={2}>
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

              <Grid item xs={6} md={2}>
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
                  sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, minWidth: '40px', p: 1 }}
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
          </CardContent>
        </Card>
      </Box>

      {renderTable()}
    </Box>
  );
};

export default StudentLedgerReport;
