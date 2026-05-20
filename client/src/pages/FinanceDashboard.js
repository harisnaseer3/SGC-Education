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
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Payment,
  EventAvailable,
  Business,
  Domain,
  People,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const StatCard = ({ title, value, icon, color, subtitle, trend, compact = false }) => (
  <Card
    elevation={0}
    sx={{
      background: `linear-gradient(135deg, ${color}10 0%, #ffffff 100%)`,
      border: `1px solid ${color}20`,
      borderRadius: 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 20px 40px ${color}15`,
        border: `1px solid ${color}40`,
      }
    }}
  >
    <CardContent sx={{ p: compact ? 3 : 4, '&:last-child': { pb: compact ? 3 : 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', opacity: 0.8 }}>
            {title}
          </Typography>
          <Typography variant={compact ? "h5" : "h4"} fontWeight="800" color={color} sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
            {value}
          </Typography>
          {(subtitle || trend) && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {subtitle && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{subtitle}</Typography>}
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
          borderRadius: 2.5, 
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `0 8px 16px ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: 2.5
        }}>
          {React.cloneElement(icon, { sx: { fontSize: compact ? 28 : 36, color: '#fff' } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const FinanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('dashboard/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Chip label="Finance Manager Dashboard" color="primary" icon={<Business />} sx={{ fontSize: '1rem', py: 2.5, px: 1, fontWeight: 'bold' }} />
      </Box>

      {dashboardData && (
        <>
          {/* Key Overviews */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                title: 'Total Institutions', 
                value: dashboardData?.overview?.totalInstitutions || 0, 
                icon: <Domain />, 
                color: '#667eea', 
                subtitle: `${dashboardData?.overview?.activeInstitutions || 0} active`, 
              },
              { 
                title: 'Total Students', 
                value: dashboardData?.users?.roleBreakdown?.students || 0, 
                icon: <People />, 
                color: '#4facfe', 
                subtitle: `Across ${dashboardData?.overview?.totalInstitutions || 0} campuses`, 
              }
            ].map((stat, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <StatCard compact {...stat} />
              </Grid>
            ))}
          </Grid>

          {/* Financial Metrics */}
          {dashboardData?.finance && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {[
                { 
                  title: 'Received Fees', 
                  value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceived || 0).toLocaleString()}`, 
                  icon: <Payment />, 
                  color: '#10b981', 
                  subtitle: 'Total collections' 
                },
                { 
                  title: 'Receivable Fees', 
                  value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceivable || 0).toLocaleString()}`, 
                  icon: <AccountBalance />, 
                  color: '#f59e0b', 
                  subtitle: 'Outstanding balance' 
                },
                { 
                  title: "Last Month's Fees", 
                  value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.lastMonthReceived || 0).toLocaleString()}`, 
                  icon: <EventAvailable />, 
                  color: '#6366f1', 
                  subtitle: 'Previous month' 
                }
              ].map((fin, i) => (
                <Grid item xs={12} sm={6} lg={4} key={i}>
                  <StatCard compact {...fin} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Campus Breakdown */}
          {dashboardData?.campusBreakdown && dashboardData.campusBreakdown.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 6, height: 20, bgcolor: '#10b981', borderRadius: 1 }} />
                    Campus Breakdown
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #edf2f7' }}>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Campus Code</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Campus Name</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Students</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Received Fees</th>
                          <th style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Receivable Fees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.campusBreakdown.map((campus, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '16px' }}><Chip label={campus.code} size="small" color="primary" variant="outlined" /></td>
                            <td style={{ padding: '16px', fontWeight: 600 }}>{campus.name}</td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#4facfe' }}>{campus.students}</td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#10b981' }}>{dashboardData?.finance?.currency || 'PKR'} {campus.received.toLocaleString()}</td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#f59e0b' }}>{dashboardData?.finance?.currency || 'PKR'} {campus.receivable.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default FinanceDashboard;
