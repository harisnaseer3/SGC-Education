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
  IconButton,
  Alert
} from '@mui/material';
import { Refresh, AttachFile, Close } from '@mui/icons-material';
import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api';
import { notifySuccess, notifyError } from '../../../utils/notify';
import { createAxiosConfig, getInstitutionId } from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const MonthWiseReconciliationReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  // Default to a 12-month period ending this month
  const today = new Date();
  const startD = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  
  const formatMonthInput = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [filters, setFilters] = useState({
    startMonth: formatMonthInput(startD),
    endMonth: formatMonthInput(today),
    chargeType: 'all',
    bankAccount: ''
  });

  const [bankAccounts, setBankAccounts] = useState([]);

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

  const generateMonthRange = (startStr, endStr) => {
    const start = new Date(startStr + '-01');
    const end = new Date(endStr + '-01');
    const months = [];
    
    let current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1; // 1-12
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const label = current.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      
      months.push({
        year,
        month,
        monthKey,
        label,
        amount: 0,
        reconcileAmount: '',
        balance: 0,
        attachment: null
      });
      
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  const handleFetchReport = async () => {
    try {
      setLoading(true);
      const config = createAxiosConfig();
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isSuperAdmin = savedUser?.role === 'super_admin';
      const institutionId = getInstitutionId(savedUser, isSuperAdmin);

      // 1. Generate base months
      let monthsArray = generateMonthRange(filters.startMonth, filters.endMonth);
      
      // Calculate strict start/end dates for API querying
      const startObj = new Date(filters.startMonth + '-01');
      const endObj = new Date(filters.endMonth + '-01');
      endObj.setMonth(endObj.getMonth() + 1);
      endObj.setDate(0); // Last day of end month

      const params = {
        startDate: startObj.toISOString().split('T')[0],
        endDate: endObj.toISOString().split('T')[0],
        institution: institutionId
      };

      // 2. Fetch parallel data
      const [paymentsRes, suspenseRes, reconRes] = await Promise.all([
        axios.get(`${API_URL}/fees/payments`, { ...config, params }),
        axios.get(`${API_URL}/fees/suspense`, { ...config, params: { institution: institutionId } }),
        axios.get(`${API_URL}/fees/monthly-reconciliations`, { ...config, params: { institution: institutionId, bankAccount: filters.bankAccount || null } })
      ]);

      let rawPayments = (paymentsRes.data.data || []).filter(p => p.status === 'completed');
      let rawSuspense = (suspenseRes.data.data || []).filter(s => s.status === 'reconciled');
      
      // Filter by bank if selected
      if (filters.bankAccount) {
        const selectedBank = bankAccounts.find(b => b._id === filters.bankAccount);
        const bankKey = selectedBank ? selectedBank.bankName : '';
        const bankCheck = (item) => {
          if (item.bankAccount && (item.bankAccount === filters.bankAccount || item.bankAccount._id === filters.bankAccount)) return true;
          if (item.bankName?.toLowerCase().includes(bankKey.toLowerCase())) return true;
          if (item.remarks?.toLowerCase().includes(bankKey.toLowerCase())) return true;
          return false;
        };
        rawPayments = rawPayments.filter(bankCheck);
        rawSuspense = rawSuspense.filter(bankCheck);
      } else {
        // Show only bank-related items if no specific bank
        rawPayments = rawPayments.filter(p => ['bank_transfer', 'online', 'cheque'].includes(p.paymentMethod) || p.bankName);
        rawSuspense = rawSuspense.filter(s => ['bank_transfer', 'online', 'cheque'].includes(s.paymentMethod) || s.bankName);
      }

      const reconRecords = reconRes.data.data || [];

      // 3. Aggregate totals per month
      rawPayments.forEach(p => {
        const d = new Date(p.paymentDate || p.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const match = monthsArray.find(x => x.monthKey === key);
        if (match) {
          match.amount += (p.amount || 0);
        }
      });

      rawSuspense.forEach(s => {
        const d = new Date(s.paymentDate || s.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const match = monthsArray.find(x => x.monthKey === key);
        if (match) {
          match.amount += (s.amount || 0);
        }
      });

      // 4. Merge manual reconciliations
      reconRecords.forEach(r => {
        const match = monthsArray.find(x => x.monthKey === r.monthKey);
        if (match) {
          match.reconcileAmount = r.reconcileAmount || 0;
          match.attachment = r.attachment;
        }
      });

      // 5. Calculate final balances
      monthsArray = monthsArray.map(m => {
        const recAmt = Number(m.reconcileAmount) || 0;
        return {
          ...m,
          balance: m.amount - recAmt
        };
      });

      setData(monthsArray);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to fetch reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetchReport();
    // eslint-disable-next-line
  }, []);

  const handleReconcileChange = (index, value) => {
    const newData = [...data];
    newData[index].reconcileAmount = value;
    
    // Auto-calculate balance as user types
    const parsedVal = value === '' ? 0 : Number(value);
    newData[index].balance = newData[index].amount - parsedVal;
    
    setData(newData);
  };

  const saveReconcileAmount = async (row) => {
    try {
      const config = createAxiosConfig();
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const institutionId = getInstitutionId(savedUser, savedUser?.role === 'super_admin');

      const payload = {
        institution: institutionId,
        monthKey: row.monthKey,
        year: row.year,
        month: row.month,
        bankAccount: filters.bankAccount || null,
        reconcileAmount: Number(row.reconcileAmount) || 0
      };

      await axios.post(`${API_URL}/fees/monthly-reconciliations`, payload, config);
      notifySuccess(`Saved reconcile amount for ${row.label}`);
    } catch (err) {
      notifyError('Failed to save reconcile amount');
    }
  };

  const handleFileUpload = async (e, row) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      notifyError('Please upload a PDF file');
      return;
    }

    try {
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const token = savedUser.token || localStorage.getItem('token');
      const institutionId = getInstitutionId(savedUser, savedUser?.role === 'super_admin');
      
      const formData = new FormData();
      formData.append('attachment', file);
      formData.append('institution', institutionId);
      if (filters.bankAccount) {
        formData.append('bankAccount', filters.bankAccount);
      }

      const response = await axios.post(
        `${API_URL}/fees/monthly-reconciliations/${row.monthKey}/attachment`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      notifySuccess('Attachment uploaded successfully');
      
      // Update local state with new attachment path
      const newData = data.map(r => {
        if (r.monthKey === row.monthKey) {
          return { ...r, attachment: response.data.data.attachment };
        }
        return r;
      });
      setData(newData);

    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to upload attachment');
    }
  };

  const handleRemoveAttachment = async (row) => {
    try {
      const config = createAxiosConfig();
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const institutionId = getInstitutionId(savedUser, savedUser?.role === 'super_admin');
      
      const payload = {
        data: {
          institution: institutionId,
          bankAccount: filters.bankAccount || null
        }
      };

      await axios.delete(`${API_URL}/fees/monthly-reconciliations/${row.monthKey}/attachment`, { ...config, ...payload });

      notifySuccess('Attachment removed successfully');
      
      const newData = data.map(r => {
        if (r.monthKey === row.monthKey) {
          return { ...r, attachment: null };
        }
        return r;
      });
      setData(newData);

    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to remove attachment');
    }
  };

  const renderAttachmentCell = (row) => {
    if (row.attachment) {
      // Display existing file link
      const fileName = row.attachment.split('/').pop() || 'File';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<AttachFile />}
            href={`${getApiBaseUrl().replace('/api/v1', '')}${row.attachment}`}
            target="_blank"
            sx={{ textTransform: 'none', borderRadius: '20px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {fileName}
          </Button>
          <IconButton size="small" color="error" onClick={() => handleRemoveAttachment(row)}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      );
    }

    const disabled = row.balance !== 0;

    return (
      <Button
        component="label"
        variant="outlined"
        color="inherit"
        size="small"
        disabled={disabled}
        startIcon={<AttachFile />}
        sx={{ borderRadius: '20px', ...(disabled && { opacity: 0.5 }) }}
      >
        Attach
        <input
          type="file"
          hidden
          accept="application/pdf"
          onChange={(e) => handleFileUpload(e, row)}
        />
      </Button>
    );
  };

  return (
    <Box>
      {/* Top Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={0} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Start Month"
              type="month"
              value={filters.startMonth}
              onChange={(e) => setFilters({ ...filters, startMonth: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="End Month"
              type="month"
              value={filters.endMonth}
              onChange={(e) => setFilters({ ...filters, endMonth: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={filters.bankAccount}
                label="Bank Account"
                onChange={(e) => setFilters({ ...filters, bankAccount: e.target.value })}
              >
                <MenuItem value="">All Bank Accounts</MenuItem>
                {bankAccounts.map((acc) => (
                  <MenuItem key={acc._id} value={acc._id}>{acc.bankName} - {acc.accountNumber}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleFetchReport}
              sx={{ bgcolor: '#1976d2', height: '40px', textTransform: 'none', borderRadius: '6px' }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Paper sx={{ p: 0, overflow: 'hidden' }} elevation={0} variant="outlined">
        <Box sx={{ p: 2, bgcolor: '#fafafa', borderBottom: '1px solid #eaeaea' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem', mb: 0.5 }}>
            Month-wise Reconciliation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Amount = Deposit + Suspense for that month. Enter Reconcile Amount; Balance = Amount - Reconcile Amount. Attachment is enabled when Balance = 0.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Amount (Deposit + Suspense)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '200px' }}>Reconcile Amount</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '150px' }}>Balance</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '200px' }}>Attachment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={row.monthKey} hover>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="center">
                      Rs {row.amount.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        size="small"
                        placeholder="Enter amount"
                        value={row.reconcileAmount}
                        onChange={(e) => handleReconcileChange(index, e.target.value)}
                        onBlur={() => saveReconcileAmount(row)}
                        inputProps={{ 
                          style: { textAlign: 'center' },
                          type: 'number'
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#fff',
                            borderRadius: '4px'
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 'bold',
                      color: row.balance > 0 ? '#d97706' : (row.balance < 0 ? '#ef4444' : '#16a34a')
                    }}>
                      Rs {row.balance.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      {renderAttachmentCell(row)}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No data available for selected period.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default MonthWiseReconciliationReport;
