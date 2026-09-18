import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Chip,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { Search, FileDownload, Print } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { notifyError } from '../../../utils/notify';
import { createAxiosConfig, getInstitutionId, exportToExcelWithBoldHeaders } from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const BankStatementReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    bankAccount: '',
    statusFilter: 'all'
  });

  useEffect(() => {
    const savedInstitution = localStorage.getItem('selectedInstitution');
    if (savedInstitution) {
      try {
        setInstitution(JSON.parse(savedInstitution));
      } catch (e) {
        console.error('Error parsing institution data');
      }
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, []);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isSuperAdmin = savedUser?.role === 'super_admin';
        const institutionId = getInstitutionId(savedUser, isSuperAdmin);
        
        const params = {};
        if (institutionId) {
          params.institution = institutionId;
        }

        const response = await axios.get(`${API_URL}/bank-accounts`, createAxiosConfig({ params }));
        setBankAccounts(response.data.data || []);
      } catch (err) {
        console.error('Error fetching bank accounts:', err);
      }
    };
    fetchBankAccounts();
  }, []);

  const getBankShortName = (name) => {
    if (!name) return '';
    const clean = name.trim().toUpperCase();
    if (clean.includes('MEEZAN')) return 'MBL';
    if (clean.includes('HABIB') || clean.includes('HBL')) return 'HBL';
    if (clean.includes('UNITED') || clean.includes('UBL')) return 'UBL';
    if (clean.includes('NATIONAL') || clean.includes('NBP')) return 'NBP';
    if (clean.includes('ALLIED') || clean.includes('ABL')) return 'ABL';
    if (clean.includes('ASKARI') || clean.includes('AKBL')) return 'AKBL';
    if (clean.includes('ALFALAH') || clean.includes('BAFL')) return 'BAFL';
    if (clean.includes('FAYSAL') || clean.includes('FBL')) return 'FBL';
    if (clean.includes('PUNJAB') || clean.includes('BOP')) return 'BOP';
    if (clean.includes('MCB')) return 'MCB';
    if (clean.includes('JS BANK') || clean.includes('JSB')) return 'JSB';
    if (clean.includes('DUBAI') || clean.includes('DIB')) return 'DIB';
    if (clean.includes('STANDARD') || clean.includes('SCB')) return 'SCB';
    if (clean.includes('SONERI')) return 'SBL';
    if (clean.includes('ISLAMI')) return 'BIPL';

    const words = clean.split(/\s+/);
    if (words.length > 1) {
      return words.map(w => w[0]).join('');
    }
    return clean.substring(0, 4);
  };

  const getBankDisplay = (item) => {
    let matchedBank = null;
    if (item.bankAccount) {
      matchedBank = bankAccounts.find(b => b._id === (item.bankAccount._id || item.bankAccount));
    }
    if (!matchedBank && item.bankName) {
      matchedBank = bankAccounts.find(b => 
        b.bankName.toLowerCase().includes(item.bankName.toLowerCase()) ||
        item.bankName.toLowerCase().includes(b.bankName.toLowerCase())
      );
    }
    if (!matchedBank && item.remarks) {
      matchedBank = bankAccounts.find(b => 
        item.remarks.toLowerCase().includes(b.bankName.toLowerCase())
      );
    }
    if (!matchedBank && filters.bankAccount) {
      matchedBank = bankAccounts.find(b => b._id === filters.bankAccount);
    }
    if (!matchedBank && bankAccounts.length === 1) {
      matchedBank = bankAccounts[0];
    }

    const rawBankName = matchedBank ? matchedBank.bankName : (item.bankName || '');
    const shortName = getBankShortName(rawBankName);
    
    const accNum = matchedBank ? matchedBank.accountNumber : '';
    const last3 = accNum && accNum.length >= 3 ? accNum.slice(-3) : accNum;

    if (shortName && last3) {
      return `${shortName}-${last3}`;
    }
    return shortName || last3 || item.bankName || '-';
  };

  const handleFetchReport = async () => {
    try {
      setLoading(true);
      const config = createAxiosConfig();
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);

      const params = {
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        institution: institutionId
      };

      // Selected bank account object if any
      const selectedBankObj = bankAccounts.find(b => b._id === filters.bankAccount);
      const bankKey = selectedBankObj ? selectedBankObj.bankName.toLowerCase() : '';

      // Fetch Fee Payments and Suspense Entries in parallel
      const [paymentsRes, suspenseRes] = await Promise.all([
        axios.get(`${API_URL}/fees/payments`, { ...config, params }),
        axios.get(`${API_URL}/fees/suspense`, { ...config, params: { institution: institutionId } })
      ]);

      let rawPayments = paymentsRes.data.data || [];
      let rawSuspense = suspenseRes.data.data || [];

      // Filter Fee Payments by bank and completion status
      rawPayments = rawPayments.filter(p => p.status === 'completed');
      if (filters.bankAccount) {
        // When a specific bank is selected, ONLY include payments that match by bankName or remarks
        rawPayments = rawPayments.filter(p =>
          (p.bankName && p.bankName.toLowerCase().includes(bankKey)) ||
          (p.remarks && p.remarks.toLowerCase().includes(bankKey))
        );
      } else {
        // When no bank is selected, show all bank-related payments (bank_transfer, online, cheque)
        rawPayments = rawPayments.filter(p =>
          ['bank_transfer', 'online', 'cheque'].includes(p.paymentMethod) || p.bankName
        );
      }

      // Filter Suspense Entries by date range and bank
      if (filters.dateFrom || filters.dateTo) {
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
        if (toDate) toDate.setHours(23, 59, 59, 999);

        rawSuspense = rawSuspense.filter(s => {
          const entryDate = new Date(s.paymentDate || s.createdAt);
          if (fromDate && entryDate < fromDate) return false;
          if (toDate && entryDate > toDate) return false;
          return true;
        });
      }

      if (filters.bankAccount) {
        rawSuspense = rawSuspense.filter(s => 
          s.bankName && s.bankName.toLowerCase().includes(bankKey)
        );
      }

      // Normalize Fee Payments into transaction objects, grouped by transactionId+student
      // One bank transaction (same transactionId) covers multiple fee heads — merge them into one row
      const txnMap = {};
      rawPayments.forEach(p => {
        const studentName = p.studentName || p.student?.personalDetails?.name || `Receipt: ${p.receiptNumber || 'N/A'}`;
        // Group by transactionId if available, fallback to voucherNumber+student, then receiptNumber
        const groupKey = p.transactionId
          ? `${p.transactionId}__${studentName}`
          : p.voucherNumber
            ? `VCH__${p.voucherNumber}__${studentName}`
            : p._id;

        // Get fee month from studentFee.vouchers
        let feeMonth = '';
        if (p.studentFee && p.studentFee.vouchers && p.studentFee.vouchers.length > 0) {
          const v = p.studentFee.vouchers[0];
          if (v && v.month && v.year) {
            feeMonth = new Date(v.year, v.month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          }
        }

        if (txnMap[groupKey]) {
          txnMap[groupKey].amount += p.amount;
          // Keep the earliest feeMonth if we have multiple fee heads
          if (!txnMap[groupKey].feeMonth && feeMonth) {
            txnMap[groupKey].feeMonth = feeMonth;
          }
        } else {
          txnMap[groupKey] = {
            _id: p._id,
            date: p.paymentDate || p.createdAt,
            amount: p.amount,
            transactionId: p.transactionId || '-',
            bankName: p.bankName || (selectedBankObj ? selectedBankObj.bankName : 'Bank'),
            bankAccount: p.bankAccount,
            status: 'reconciled',
            statusLabel: 'Reconciled',
            details: studentName,
            studentRoll: p.student?.rollNumber || '-',
            voucherNumber: p.voucherNumber || '-',
            feeMonth
          };
        }
      });
      const paymentTxns = Object.values(txnMap);

      // Normalize Suspense Entries into transaction objects
      const suspenseTxns = rawSuspense.map(s => ({
        _id: s._id,
        date: s.paymentDate || s.createdAt,
        amount: s.amount,
        transactionId: s.transactionId || '-',
        bankName: s.bankName || (selectedBankObj ? selectedBankObj.bankName : 'Bank'),
        status: s.status === 'reconciled' ? 'reconciled_suspense' : 'suspense',
        statusLabel: s.status === 'reconciled' ? 'Reconciled Suspense' : 'Suspense',
        details: s.remarks || 'Suspense Entry',
        studentRoll: '-',
        voucherNumber: '-'
      }));

      // Combine and filter by status option
      let combined = [...paymentTxns, ...suspenseTxns];
      if (filters.statusFilter === 'reconciled') {
        combined = combined.filter(t => t.status === 'reconciled' || t.status === 'reconciled_suspense');
      } else if (filters.statusFilter === 'suspense') {
        combined = combined.filter(t => t.status === 'suspense');
      }

      // Sort by date descending
      combined.sort((a, b) => new Date(b.date) - new Date(a.date));

      setData(combined);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to fetch bank transactions report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    const exportData = data.map((item, index) => ({
      'Sr #': index + 1,
      'Date': formatDate(item.date),
      'Amount': item.amount,
      'Transaction ID': item.transactionId,
      'Bank': getBankDisplay(item),
      'Status': item.statusLabel,
      'Details / Student': item.details
    }));

    exportToExcelWithBoldHeaders(
      XLSX,
      exportData,
      'Bank Transactions Report',
      `Bank_Transactions_${filters.dateFrom}_to_${filters.dateTo}.xlsx`
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalReconciled = data
    .filter(item => item.status === 'reconciled' || item.status === 'reconciled_suspense')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalSuspense = data
    .filter(item => item.status === 'suspense')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <Box>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #report-print-area, #report-print-area * {
              visibility: visible;
            }
            #report-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: landscape;
              margin: 10mm;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border-bottom: 1px solid #ddd !important;
              padding: 5px !important;
              font-size: 8pt !important;
            }
          }
        `}
      </style>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={filters.bankAccount}
                label="Bank Account"
                onChange={(e) => setFilters({ ...filters, bankAccount: e.target.value })}
              >
                <MenuItem value="">All Bank Accounts</MenuItem>
                {bankAccounts.map((acc) => (
                  <MenuItem key={acc._id} value={acc._id}>
                    {acc.bankName} - {acc.accountNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.statusFilter}
                label="Status"
                onChange={(e) => setFilters({ ...filters, statusFilter: e.target.value })}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="reconciled">Reconciled</MenuItem>
                <MenuItem value="suspense">Suspense</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={1}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Search />}
              onClick={handleFetchReport}
              sx={{ bgcolor: '#667eea', height: '40px' }}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Metric Cards */}
      {data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }} className="no-print">
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: '#eef2ff', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">Total Transactions</Typography>
                <Typography variant="h6" fontWeight="bold">{data.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: '#f0fdf4', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">Reconciled Amount</Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  PKR {totalReconciled.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: '#fffbe6', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">Suspense Amount</Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  PKR {totalSuspense.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ bgcolor: '#f8fafc', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  PKR {totalAmount.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : data.length > 0 ? (
        <Box id="report-print-area">
          <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
            <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportExcel} color="success">
              Export
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 1 }}>
            {institution?.logo && (
              <Box
                component="img"
                src={getLogoUrl(institution.logo, institution._id)}
                sx={{ height: 60, width: 60, borderRadius: '50%', mb: 1, objectFit: 'cover' }}
              />
            )}
            <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'serif' }}>
              {institution?.name || 'TIGES - TAJ CAMPUS'}
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'serif', mt: -1 }}>
              {institution?.address?.city || 'Islamabad'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', textDecoration: 'underline', mt: 0.5 }}>
              Bank Transactions & Statement Report
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 1, fontSize: '0.85rem' }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2"><b>From:</b> {formatDate(filters.dateFrom)}</Typography>
              <Typography variant="body2"><b>To:</b> {formatDate(filters.dateTo)}</Typography>
              <Typography variant="body2">
                <b>Bank Account:</b> {filters.bankAccount ? bankAccounts.find(b => b._id === filters.bankAccount)?.bankName + ' (' + bankAccounts.find(b => b._id === filters.bankAccount)?.accountNumber + ')' : 'All Accounts'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2">
                <b>Print Date:</b> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp; {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderBottomWidth: 2, borderColor: 'black', mb: 1 }} />

          <TableContainer component={Paper} elevation={0} sx={{ border: 'none' }}>
            <Table size="small" sx={{ 
              '& th': { fontWeight: 'bold', borderBottom: '1px solid black', px: 1, py: 0.8, fontSize: '0.8rem' },
              '& td': { borderBottom: '1px solid #eee', px: 1, py: 0.6, fontSize: '0.8rem' }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '50px' }}>Sr #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Fee Month</TableCell>
                  <TableCell align="right">Amount (PKR)</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Bank</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Details / Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={row._id + '-' + index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: '#7c3aed', fontWeight: 600 }}>{row.feeMonth || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {row.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{row.transactionId || '-'}</TableCell>
                    <TableCell>{getBankDisplay(row)}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.statusLabel}
                        size="small"
                        color={
                          row.status === 'reconciled'
                            ? 'success'
                            : row.status === 'reconciled_suspense'
                            ? 'info'
                            : 'warning'
                        }
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: '22px' }}
                      />
                    </TableCell>
                    <TableCell>{row.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ borderTop: '1px solid black', mt: 2, pt: 1, px: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Total Transactions: {data.length}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Total Amount: PKR {totalAmount.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }} className="no-print">
          No bank transactions found for the selected bank or date criteria. Click Search to load transactions.
        </Alert>
      )}
    </Box>
  );
};

export default BankStatementReport;
