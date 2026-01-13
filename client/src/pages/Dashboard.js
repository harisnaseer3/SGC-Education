import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TablePagination,
  Tabs,
  Tab,
} from '@mui/material';
import {
  AccountCircle,
  School,
  ExitToApp,
  Settings,
  AccountBalance,
  TrendingUp,
  People,
  Domain,
  Assessment,
  CheckCircle,
  Cancel,
  Business,
  Description,
  Event,
  Message,
  Speed,
  ContactMail,
  PersonAdd,
  EventAvailable,
  Payment,
  Notifications,
  Report,
  MenuBook,
  LocalLibrary,
  Inventory,
  SupervisorAccount,
  DirectionsBus,
  Brush,
  Hotel,
  PendingActions,
  ExpandMore,
  ExpandLess,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import InstitutionSwitcher from '../components/InstitutionSwitcher';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState(0);
  const sidebarWidth = 280;

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
      let url = 'http://localhost:5000/api/v1/dashboard/stats';
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

  const modules = [
    { name: 'Inquiry', icon: <ContactMail />, color: '#667eea', route: null },
    { name: 'Admissions', icon: <PersonAdd />, color: '#f093fb', route: '/admissions' },
    { name: 'Attendance', icon: <EventAvailable />, color: '#4facfe', route: null },
    { name: 'Fee Management', icon: <Payment />, color: '#43e97b', route: '/fee-management' },
    { name: 'Results', icon: <Assessment />, color: '#feca57', route: null },
    { name: 'SMS & Notification', icon: <Notifications />, color: '#fa709a', route: '/notifications' },
    { name: 'Complaints', icon: <Report />, color: '#ee5a6f', route: null },
    { name: 'Academics', icon: <MenuBook />, color: '#764ba2', route: null },
    { name: 'HR Management', icon: <People />, color: '#667eea', route: null },
    { name: 'Library', icon: <LocalLibrary />, color: '#f093fb', route: null },
    { name: 'Assets Management', icon: <Inventory />, color: '#4facfe', route: null },
    { name: 'Finance Management', icon: <AccountBalance />, color: '#43e97b', route: null },
    { name: 'User & Privilege', icon: <SupervisorAccount />, color: '#feca57', route: '/users' },
    { name: 'Configuration', icon: <Settings />, color: '#fa709a', route: '/settings' },
    { name: 'Transport', icon: <DirectionsBus />, color: '#ee5a6f', route: null },
    { name: 'Event', icon: <Event />, color: '#764ba2', route: '/calendar' },
    { name: 'Institute Branding', icon: <Brush />, color: '#667eea', route: null },
    { name: 'Student Consultancy', icon: <School />, color: '#f093fb', route: null },
    { name: 'Franchise Management', icon: <Business />, color: '#4facfe', route: null },
    { name: 'Hostel Management', icon: <Hotel />, color: '#43e97b', route: null },
    { name: 'Electronic Paper Generation', icon: <Description />, color: '#feca57', route: '/reports' },
  ];

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
    } else {
      alert(`${module.name} module is coming soon!`);
    }
  };

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
          transform: 'translateY(-4px) scale(1.01)',
          boxShadow: `0 12px 24px ${color}15`,
          border: `1px solid ${color}40`,
        }
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 2.5, '&:last-child': { pb: compact ? 2 : 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {title}
            </Typography>
            <Typography variant={compact ? "h5" : "h4"} fontWeight="800" color={color} sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
            {(subtitle || trend) && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {subtitle && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{subtitle}</Typography>}
                {trend && (
                  <Chip 
                    label={`+${trend}`}
                    size="small"
                    icon={<TrendingUp sx={{ fontSize: '10px !important', color: 'inherit !important' }} />}
                    sx={{ 
                      height: 18, 
                      fontSize: '0.65rem', 
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
            p: 1.2, 
            borderRadius: 2, 
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            boxShadow: `0 4px 10px ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon, { sx: { fontSize: compact ? 22 : 26, color: '#fff' } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const MetricGroup = ({ title, metrics, color }) => (
    <Paper elevation={0} sx={{ 
      p: 2.5, 
      borderRadius: 3, 
      border: '1px solid #edf2f7', 
      height: '100%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'box-shadow 0.3s ease',
      '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }
    }}>
      <Typography variant="subtitle2" fontWeight="800" gutterBottom sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 18, bgcolor: color, borderRadius: 1 }} />
        {title}
      </Typography>
      <Grid container spacing={2}>
        {metrics.map((m, i) => (
          <Grid item xs={4} key={i}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>{m.label}</Typography>
              <Typography variant="h6" fontWeight="bold" color={color}>{m.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Toolbar>
            <School sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              SGC Education - Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4, overflow: 'visible' }}>
      {/* Top Navigation Bar - Fixed */}
      <AppBar position="fixed" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '64px !important' }}>
          <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
            SGC Education - Dashboard
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mx: 2 }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' }, fontWeight: 500 }}>
              Welcome back, {user.name || 'Admin'}!
            </Typography>
            {selectedInstitution && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {selectedInstitution.name}
                </Typography>
                <Chip
                  label={selectedInstitution.type}
                  size="small"
                  sx={{ 
                    textTransform: 'capitalize',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    height: 24,
                    fontSize: '0.7rem'
                  }}
                />
                <Chip
                  label={selectedInstitution.isActive ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    bgcolor: selectedInstitution.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(158, 158, 158, 0.3)',
                    color: 'white',
                    height: 24,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            <InstitutionSwitcher />
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleProfile}>
                <Settings sx={{ mr: 1 }} fontSize="small" />
                Profile Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar + Content Layout */}
      <Box sx={{ display: 'flex' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              position: 'fixed',
              top: 64,
              left: 0,
              height: 'calc(100vh - 64px)',
              borderRight: '1px solid #e0e0e0',
              overflowY: 'auto',
              bgcolor: 'white',
              zIndex: (theme) => theme.zIndex.drawer,
            },
          }}
        >
          <List sx={{ pt: 0 }}>
            {/* Dashboard */}
            <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton 
                selected 
                onClick={() => navigate('/dashboard')}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: '#667eea15',
                    color: '#667eea',
                    '& .MuiListItemIcon-root': { color: '#667eea' },
                    '&:hover': { bgcolor: '#667eea25' }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Dashboard"
                  primaryTypographyProps={{
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}
                />
              </ListItemButton>
            </ListItem>

            <Divider sx={{ my: 1 }} />

            {/* Modules */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                Our Modules
              </Typography>
            </Box>

            {modules.map((module, index) => (
              <ListItem key={index} disablePadding sx={{ px: 1, mb: 0.2 }}>
                <ListItemButton
                  onClick={() => handleModuleClick(module)}
                  sx={{
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: `${module.color}10`,
                      '& .MuiListItemIcon-root': { transform: 'scale(1.1)' }
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, transition: 'transform 0.2s ease' }}>
                    {React.cloneElement(module.icon, {
                      sx: { color: module.color, fontSize: 20 }
                    })}
                  </ListItemIcon>
                  <ListItemText 
                    primary={module.name}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: '64px', // Account for fixed navbar
          }}
        >
          <Box sx={{ mt: { xs: 1, sm: 1.5 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 }, width: '100%' }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Main Layout Area */}
        {/* Compact Stats Row */}
        {dashboardData && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                compact
                title="Total Institutions"
                value={dashboardData.overview.totalInstitutions}
                icon={<Domain />}
                color="#667eea"
                subtitle={`${dashboardData.overview.activeInstitutions} active`}
                trend={dashboardData.growth.institutionsLast30Days}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                compact
                title="Total Users"
                value={dashboardData.overview.totalUsers}
                icon={<People />}
                color="#4facfe"
                subtitle={`${dashboardData.users.roleBreakdown.students} students`}
                trend={dashboardData.growth.usersLast30Days}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                compact
                title="System Health"
                value="100%"
                icon={<Assessment />}
                color="#43e97b"
                subtitle="All systems operational"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                compact
                title="Today's Activity"
                value="0"
                icon={<Notifications />}
                color="#fa709a"
                subtitle="No alerts today"
              />
            </Grid>
          </Grid>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Main Dashboard Area */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {/* Grouped Metrics Row */}
              {dashboardData && (
                <>
                  <Grid item xs={12} sm={6}>
                    <MetricGroup 
                      title="Institution Distribution"
                      color="#f093fb"
                      metrics={[
                        { label: 'Schools', value: dashboardData.institutions.typeBreakdown.schools || 0 },
                        { label: 'Colleges', value: dashboardData.institutions.typeBreakdown.colleges || 0 },
                        { label: 'Active', value: dashboardData.institutions.statusBreakdown.active || 0 },
                      ]}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricGroup 
                      title="User Distribution"
                      color="#4facfe"
                      metrics={[
                        { label: 'Students', value: dashboardData.users.roleBreakdown.students || 0 },
                        { label: 'Staff', value: dashboardData.users.roleBreakdown.teachers || 0 },
                        { label: 'Admins', value: dashboardData.users.roleBreakdown.admins || 0 },
                      ]}
                    />
                  </Grid>
                </>
              )}

              {/* Tabbed Breakdowns */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Tabs 
                      value={breakdownTab} 
                      onChange={(e, v) => setBreakdownTab(v)} 
                      centered
                      sx={{
                        minHeight: 40,
                        bgcolor: '#f1f5f9',
                        borderRadius: 10,
                        p: 0.5,
                        '& .MuiTabs-indicator': {
                          display: 'none'
                        }
                      }}
                    >
                      {[
                        { label: 'Institution Overview', icon: <Business /> },
                        { label: 'User Breakdown', icon: <People /> }
                      ].map((tab, idx) => (
                        <Tab 
                          key={idx}
                          label={tab.label}
                          icon={React.cloneElement(tab.icon, { sx: { fontSize: 18 } })}
                          iconPosition="start"
                          sx={{ 
                            textTransform: 'none', 
                            fontWeight: 700, 
                            minHeight: 32,
                            borderRadius: 10,
                            px: 3,
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            '&.Mui-selected': {
                              bgcolor: 'white',
                              color: '#667eea',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                            },
                            transition: 'all 0.2s ease'
                          }} 
                        />
                      ))}
                    </Tabs>
                  </Box>

                  {dashboardData && (
                    <Box sx={{ py: 1 }}>
                      {breakdownTab === 0 ? (
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Schools</Typography>
                                <Typography variant="body2" fontWeight="bold">{dashboardData.institutions.typeBreakdown.schools}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={(dashboardData.institutions.typeBreakdown.schools / dashboardData.institutions.total) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' } }} 
                              />
                            </Box>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="bold">Colleges</Typography>
                                <Typography variant="caption" fontWeight="bold">{dashboardData.institutions.typeBreakdown.colleges}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={(dashboardData.institutions.typeBreakdown.colleges / dashboardData.institutions.total) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)' } }} 
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Box sx={{ flex: 1, p: 2, bgcolor: '#43e97b10', borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" display="block" color="text.secondary">Active</Typography>
                                <Typography variant="h5" fontWeight="bold" color="#43e97b">{dashboardData.institutions.statusBreakdown.active}</Typography>
                              </Box>
                              <Box sx={{ flex: 1, p: 2, bgcolor: '#ff616110', borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="caption" display="block" color="text.secondary">Inactive</Typography>
                                <Typography variant="h5" fontWeight="bold" color="#ff6161">{dashboardData.institutions.statusBreakdown.inactive}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      ) : (
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2">Students</Typography>
                                <Typography variant="body2" fontWeight="bold">{dashboardData.users.roleBreakdown.students}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={(dashboardData.users.roleBreakdown.students / dashboardData.users.total) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' } }} 
                              />
                            </Box>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="bold">Teachers</Typography>
                                <Typography variant="caption" fontWeight="bold">{dashboardData.users.roleBreakdown.teachers}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={(dashboardData.users.roleBreakdown.teachers / dashboardData.users.total) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)' } }} 
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, border: '1px dashed #e0e0e0', borderRadius: 2 }}>
                              <Box textAlign="center">
                                <Typography variant="caption" display="block" color="text.secondary">Admins</Typography>
                                <Typography variant="h6" fontWeight="bold">{dashboardData.users.roleBreakdown.admins}</Typography>
                              </Box>
                              <Divider orientation="vertical" flexItem />
                              <Box textAlign="center">
                                <Typography variant="caption" display="block" color="text.secondary">Total</Typography>
                                <Typography variant="h6" fontWeight="bold">{dashboardData.users.total}</Typography>
                              </Box>
                              <Divider orientation="vertical" flexItem />
                              <Box textAlign="center">
                                <Typography variant="caption" display="block" color="text.secondary">Growth</Typography>
                                <Typography variant="h6" fontWeight="bold" color="success.main">+{dashboardData.growth.usersLast30Days}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Right Side: Quick Actions & Brief Reports */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Quick Actions</Typography>
                <Grid container spacing={1}>
                  {[
                    { label: 'Admissions', icon: <PersonAdd />, route: '/admissions' },
                    { label: 'Institutions', icon: <Domain />, route: '/institutions' },
                    { label: 'Fees', icon: <Payment />, route: '/fee-management' },
                    { label: 'Profile', icon: <AccountCircle />, route: '/profile' }
                  ].map((action, i) => (
                    <Grid item xs={6} key={i}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="small"
                        onClick={() => navigate(action.route)}
                        startIcon={React.cloneElement(action.icon, { sx: { fontSize: 16 } })}
                        sx={{ textTransform: 'none', py: 1 }}
                      >
                        {action.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {dashboardData && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: '#667eea', color: 'white' }}>
                  <Typography variant="subtitle2" fontWeight="bold">Growth Overview</Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>New Institutions</Typography>
                      <Typography variant="h6">+{dashboardData.growth.institutionsLast30Days}</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>New Users</Typography>
                      <Typography variant="h6">+{dashboardData.growth.usersLast30Days}</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Box>
        </Grid>
      </Grid>

        {/* Bottom Area: Feeds Side-by-Side */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ActivityFeed limit={8} title="Recent Activity" />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e0e0e0', height: '100%' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <School color="primary" sx={{ fontSize: 20 }} />
                Recently Added Institutions
              </Typography>
              <Box sx={{ mt: 2 }}>
                {dashboardData?.recentInstitutions.slice(0, 5).map((inst, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1.5 }}>
                      <Business sx={{ fontSize: 20, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="bold" noWrap>{inst.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{inst.type} • {new Date(inst.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                    <Chip label={inst.isActive ? 'Active' : 'Off'} size="small" variant="outlined" color={inst.isActive ? 'success' : 'default'} />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;