import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { getAllModules } from '../config/modules';
import {
  AccountBalance,
  TrendingUp,
  People,
  Domain,
  Assessment,
  Business,
  Description,
  Event,
  Message,
  Speed,
  PersonAdd,
  EventAvailable,
  Payment,
  Notifications,
  Report,
  PersonOff,
  Receipt,
  CheckCircle,
  PendingActions,
  DateRange,
  Warning,
  School,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import FinanceDashboard from './FinanceDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState(0);
  const [showLogo, setShowLogo] = useState(true); // For logo fallback
  const [voucherFilter, setVoucherFilter] = useState('allTime');
  
  // Generate cache-busting parameter once on mount to ensure fresh logo
  const [logoCacheBuster] = useState(() => `?t=${Date.now()}`);

  useEffect(() => {
    fetchDashboardStats();

    // Load selected institution
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData) {
      try {
        setSelectedInstitution(JSON.parse(institutionData));
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Build URL with institution parameter if available
      let url = getApiUrl('dashboard/stats');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          url += `?institution=${institution._id}`;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      const response = await axios.get(url, {
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

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Get modules from shared configuration and convert icon components to elements
  const modules = getAllModules().map(module => ({
    ...module,
    icon: <module.icon />
  }));

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
    } else {
      alert(`${module.name} module is coming soon!`);
    }
  };

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
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        '&:hover': {
          transform: onClick ? 'translateY(-6px)' : 'none',
          boxShadow: onClick ? `0 20px 40px ${color}15` : '0 4px 20px rgba(0,0,0,0.03)',
          border: onClick ? `1px solid ${color}40` : `1px solid ${color}20`,
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

  const MetricGroup = ({ title, metrics, color }) => (
    <Paper elevation={0} sx={{ 
      p: 2, 
      borderRadius: 4, 
      border: '1px solid #edf2f7', 
      pb: 1.5,
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'all 0.3s ease',
      '&:hover': { 
        boxShadow: '0 12px 30px rgba(0,0,0,0.05)',
      }
    }}>
      <Typography variant="subtitle1" fontWeight="800" gutterBottom sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ width: 6, height: 24, bgcolor: color, borderRadius: 1 }} />
        {title}
      </Typography>
      <Grid container spacing={2}>
        {metrics.map((m, i) => (
          <Grid item xs={4} key={i}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>{m.label}</Typography>
              <Typography variant="h6" fontWeight="800" color={color}>{m.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  const AlertItem = ({ title, count, icon, color, onClick }) => (
    <Box 
      onClick={onClick}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        p: 2, 
        borderRadius: 2, 
        cursor: 'pointer',
        bgcolor: `${color}08`, 
        border: `1px solid ${color}15`,
        transition: 'all 0.2s ease',
        '&:hover': { bgcolor: `${color}15`, transform: 'translateX(4px)' }
      }}
    >
      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'white', display: 'flex', color: color, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        {React.cloneElement(icon, { sx: { fontSize: 20 } })}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight="700" color="text.primary">{title}</Typography>
        <Typography variant="caption" color="text.secondary">{count} pending items</Typography>
      </Box>
      <Typography variant="h6" fontWeight="800" color={color}>{count}</Typography>
    </Box>
  );

  const EventItem = ({ event }) => (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      p: 2, 
      borderRadius: 2, 
      bgcolor: '#f8fafc',
      borderLeft: `4px solid ${event.color || '#667eea'}`,
      '&:hover': { bgcolor: '#f1f5f9' },
      transition: 'background 0.2s ease'
    }}>
      <Box sx={{ textAlign: 'center', minWidth: 50 }}>
        <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
          {new Date(event.startDate).toLocaleString('default', { month: 'short' })}
        </Typography>
        <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ lineHeight: 1 }}>
          {new Date(event.startDate).getDate()}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight="700" color="text.primary">
          {event.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Event sx={{ fontSize: 14 }} /> {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {event.location && ` • ${event.location}`}
        </Typography>
      </Box>
    </Box>
  );

  if (user.role === 'finance_manager') {
    return <FinanceDashboard />;
  }

  const getActiveVoucherData = () => {
    if (!dashboardData?.vouchers) return null;
    if (['allTime', 'currentMonth', 'prevMonth'].includes(voucherFilter)) {
      return dashboardData.vouchers[voucherFilter];
    }
    const [month, year] = voucherFilter.split('-');
    const found = dashboardData.vouchers.monthlyBreakdown?.find(
      (m) => m._id.month === parseInt(month) && m._id.year === parseInt(year)
    );
    return found || { total: 0, paid: 0, pending: 0, overdue: 0 };
  };
  const activeVoucherData = getActiveVoucherData();

  const getVoucherChartData = () => {
    if (!dashboardData?.vouchers?.monthlyBreakdown) return [];
    const reversed = [...dashboardData.vouchers.monthlyBreakdown].reverse();
    return reversed.map((m) => {
      const date = new Date(m._id.year, m._id.month - 1, 1);
      return {
        name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        Total: m.total,
        Paid: m.paid,
        Pending: m.pending,
        Overdue: m.overdue
      };
    });
  };
  const voucherChartData = getVoucherChartData();

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

          {dashboardData && (
            <>
              {/* Row 1: Key Performance Indicators (Compact) */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { 
                    title: 'Total Students', 
                    value: dashboardData?.users?.roleBreakdown?.students || 0, 
                    icon: <People />, 
                    color: '#4facfe', 
                    subtitle: 'Active enrollments',
                    path: '/users'
                  },
                  { 
                    title: 'New Admissions', 
                    value: dashboardData?.administrative?.newAdmissions || 0, 
                    icon: <PersonAdd />, 
                    color: '#6366f1', 
                    subtitle: 'Last 30 days',
                    path: '/admissions'
                  },
                  { 
                    title: 'Enrolled Students', 
                    value: dashboardData?.administrative?.enrolledStudents || 0, 
                    icon: <CheckCircle />, 
                    color: '#10b981', 
                    subtitle: 'Currently enrolled',
                    path: '/admissions'
                  },
                  { 
                    title: 'Struck Off Students', 
                    value: dashboardData?.administrative?.struckOffStudents || 0, 
                    icon: <PersonOff />, 
                    color: '#ff6b6b', 
                    subtitle: 'Total struck off',
                    path: '/admissions/students/search-all?status=Struck%20Off'
                  }
                ].map((stat, i) => (
                  <Grid item xs={12} sm={6} lg={3} key={i}>
                    <StatCard compact {...stat} onClick={() => stat.path && navigate(stat.path)} />
                  </Grid>
                ))}
              </Grid>

              {/* Row 2: Financial Metrics */}
              {dashboardData?.finance && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { 
                      title: 'Total Billed', 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalBilled || 0).toLocaleString()}`, 
                      icon: <AccountBalance />, 
                      color: '#6366f1', 
                      subtitle: 'Accounts receivable',
                      path: '/fee-management'
                    },
                    { 
                      title: 'Total Collected', 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalCollected || 0).toLocaleString()}`, 
                      icon: <Payment />, 
                      color: '#10b981', 
                      subtitle: 'All-time collections',
                      path: '/fee-management'
                    },
                    { 
                      title: 'Total Outstanding', 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalOutstanding || 0).toLocaleString()}`, 
                      icon: <Assessment />, 
                      color: '#f59e0b', 
                      subtitle: 'Total unpaid arrears',
                      path: '/fee-management'
                    },
                    { 
                      title: "Last Month Collected", 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.lastMonthCollected || 0).toLocaleString()}`, 
                      icon: <EventAvailable />, 
                      color: '#4facfe', 
                      subtitle: 'Previous month',
                      path: '/fee-management'
                    }
                  ].map((fin, i) => (
                    <Grid item xs={12} sm={6} lg={3} key={i}>
                      <StatCard compact {...fin} onClick={() => fin.path && navigate(fin.path)} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Row 3: Voucher Overview */}
              {activeVoucherData && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold">
                      Voucher Overview
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <Select
                        value={voucherFilter}
                        onChange={(e) => setVoucherFilter(e.target.value)}
                        sx={{ bgcolor: 'white', borderRadius: 2 }}
                      >
                        <MenuItem value="allTime">All Time</MenuItem>
                        <MenuItem value="currentMonth">Current Month</MenuItem>
                        <MenuItem value="prevMonth">Previous Month</MenuItem>
                        {dashboardData?.vouchers?.monthlyBreakdown?.map((m) => {
                           const date = new Date(m._id.year, m._id.month - 1, 1);
                           const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                           return <MenuItem key={`${m._id.month}-${m._id.year}`} value={`${m._id.month}-${m._id.year}`}>{label}</MenuItem>
                        })}
                      </Select>
                    </FormControl>
                  </Box>
                  <Grid container spacing={3}>
                  {[
                    { 
                      title: 'Total Vouchers', 
                      value: activeVoucherData.total || 0, 
                      icon: <Receipt />, 
                      color: '#6366f1', 
                      subtitle: 'Generated',
                      path: '/fee-management'
                    },
                    { 
                      title: 'Paid Vouchers', 
                      value: activeVoucherData.paid || 0, 
                      icon: <CheckCircle />, 
                      color: '#34d399', 
                      subtitle: 'Fully paid',
                      path: '/fee-management'
                    },
                    { 
                      title: 'Pending Vouchers', 
                      value: activeVoucherData.pending || 0, 
                      icon: <PendingActions />, 
                      color: '#f59e0b', 
                      subtitle: 'Unpaid / Partial',
                      path: '/fee-management'
                    },
                    { 
                      title: 'Overdue Vouchers', 
                      value: activeVoucherData.overdue || 0, 
                      icon: <Warning />, 
                      color: '#ef4444', 
                      subtitle: 'Past due date',
                      path: '/fee-management'
                    }
                  ].map((stat, i) => (
                    <Grid item xs={12} sm={6} lg={3} key={i}>
                      <StatCard compact {...stat} onClick={() => stat.path && navigate(stat.path)} />
                    </Grid>
                  ))}
                  </Grid>

                  {/* Voucher Trend Chart */}
                  {voucherChartData.length > 0 && (
                    <Paper elevation={0} sx={{ mt: 3, p: 3, borderRadius: 4, border: '1px solid #edf2f7' }}>
                      <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 2 }}>Monthly Voucher Trend</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={voucherChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                          <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Paid" fill="#34d399" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Row 4: Quick Actions (Horizontal) */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Quick Actions */}
                <Grid item xs={12} lg={12}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 3 }}>Quick Actions</Typography>
                    <Grid container spacing={2}>
                      {[
                        { label: 'Register Student', icon: <PersonAdd />, color: '#667eea', path: '/admissions/new' },
                        { label: 'Generate Voucher', icon: <Receipt />, color: '#8b5cf6', path: '/fee-management?tab=voucher-generation' },
                        { label: 'Collect Fee', icon: <Payment />, color: '#10b981', path: '/fee-management?tab=fee-deposit' },
                        { label: 'Add Event', icon: <Event />, color: '#f093fb', path: '/calendar' },
                        { label: 'Manage Users', icon: <People />, color: '#4facfe', path: '/users' },
                        { label: 'Manage Classes', icon: <School />, color: '#8b5cf6', path: '/classes' },
                        { label: 'View Results', icon: <Assessment />, color: '#f59e0b', path: '/results' }
                      ].map((action, i) => (
                        <Grid item xs={6} sm={4} md={3} lg={12/7} key={i}>
                          <Button
                            fullWidth
                            onClick={() => navigate(action.path)}
                            variant="outlined"
                            sx={{
                              flexDirection: 'column',
                              py: 3,
                              borderRadius: 4,
                              borderColor: '#edf2f7',
                              color: 'text.primary',
                              gap: 1.5,
                              '&:hover': { bgcolor: `${action.color}08`, borderColor: action.color }
                            }}
                          >
                            {React.cloneElement(action.icon, { sx: { color: action.color, fontSize: 24 } })}
                            <Typography variant="caption" fontWeight="700">{action.label}</Typography>
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Row 6: Comprehensive Analytics Charts */}
              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <DashboardCharts />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
  );
};

export default Dashboard;