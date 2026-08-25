import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton
} from '@mui/material';
import {
  AccountBalanceWallet,
  Receipt,
  Search,
  Visibility,
  ArrowBack,
  ReceiptLong
} from '@mui/icons-material';
import BankReconciliationReport from './reports/BankReconciliationReport';
import FeeListReport from './reports/FeeListReport';
import RemainingBalanceReport from './reports/RemainingBalanceReport';
import BankVouchersReport from './reports/BankVouchersReport';

const ReportsTab = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const renderReport = () => {
    switch (selectedReport) {
      case 'bank-reconciliation':
        return <BankReconciliationReport onBack={() => setSelectedReport(null)} />;
      case 'fee-list':
        return <FeeListReport onBack={() => setSelectedReport(null)} />;
      case 'remaining-balance':
        return <RemainingBalanceReport onBack={() => setSelectedReport(null)} />;
      case 'bank-vouchers':
        return <BankVouchersReport onBack={() => setSelectedReport(null)} />;
      default:
        return null;
    }
  };

  const reports = [
    {
      id: 'bank-reconciliation',
      title: 'Bank Reconciliation',
      description: 'Fee Collected in Bank for Reconciliation. Detailed report of all bank-channeled payments.',
      icon: <AccountBalanceWallet sx={{ fontSize: 24, color: '#4f46e5' }} />,
      bgColor: '#e0e7ff',
      shadowColor: 'rgba(79, 70, 229, 0.2)'
    },
    {
      id: 'fee-list',
      title: 'Fee List',
      description: 'Comprehensive list of all fees Generated vs Collected for a specific period.',
      icon: <ReceiptLong sx={{ fontSize: 24, color: '#0284c7' }} />,
      bgColor: '#e0f2fe',
      shadowColor: 'rgba(2, 132, 199, 0.2)'
    },
    {
      id: 'remaining-balance',
      title: 'Remaining Balance',
      description: 'Student List with Remaining Balance. Track outstanding dues for all students.',
      icon: <Search sx={{ fontSize: 24, color: '#d97706' }} />,
      bgColor: '#fef3c7',
      shadowColor: 'rgba(217, 119, 6, 0.2)'
    },
    {
      id: 'bank-vouchers',
      title: 'Bank Vouchers',
      description: 'Detailed report of Bank Vouchers for fee collection.',
      icon: <Receipt sx={{ fontSize: 24, color: '#16a34a' }} />,
      bgColor: '#dcfce7',
      shadowColor: 'rgba(22, 163, 74, 0.2)'
    }
  ];

  if (selectedReport) {
    const report = reports.find(r => r.id === selectedReport);
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => setSelectedReport(null)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" fontWeight="bold" color="#667eea">
            {report?.title}
          </Typography>
        </Box>
        {renderReport()}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#667eea' }}>
          FEE REPORTS
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a report to view and export data
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
        {reports.map((report) => (
          <Box 
            key={report.id} 
            sx={{ 
              flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(50% - 12px)' },
              maxWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(50% - 12px)' },
              boxSizing: 'border-box',
              display: 'flex'
            }}
          >
            <Card sx={{ 
              width: '100%',
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
              border: '1px solid #eef2f6',
              transition: 'all 0.3s ease-in-out', 
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)',
                borderColor: '#667eea'
              } 
            }}>
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#2c3e50', fontSize: '1.1rem' }}>
                    {report.title}
                  </Typography>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2.5, 
                    bgcolor: report.bgColor, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: `0 4px 10px ${report.shadowColor}`
                  }}>
                    {report.icon}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                  {report.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  sx={{ 
                    bgcolor: '#667eea', 
                    color: '#fff',
                    borderRadius: 2,
                    py: 1,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    '&:hover': { bgcolor: '#5a6fd6', boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)' } 
                  }} 
                  startIcon={<Visibility />}
                  onClick={() => setSelectedReport(report.id)}
                >
                  View Report
                </Button>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ReportsTab;
