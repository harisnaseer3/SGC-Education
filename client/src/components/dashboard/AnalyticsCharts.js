import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { getApiUrl } from '../../config/api';

const AnalyticsCharts = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Build URL with institution parameter if available
      let url = `${getApiUrl('dashboard/analytics')}?days=${period}`;
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          url += `&institution=${institution._id}`;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (trends) => {
    if (!trends || trends.length === 0) return [];

    return trends.map(item => ({
      date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: item.count
    }));
  };

  const formatUserTrends = (userTrends) => {
    if (!userTrends || userTrends.length === 0) return [];

    const grouped = {};
    userTrends.forEach(item => {
      const date = item._id.date;
      const role = item._id.role;

      if (!grouped[date]) {
        grouped[date] = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      }
      grouped[date][role] = item.count;
    });

    return Object.values(grouped);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>;
  }

  if (!analyticsData) {
    return null;
  }

  const institutionData = formatChartData(analyticsData.institutionTrends);
  const departmentData = formatChartData(analyticsData.departmentTrends);
  const userData = formatUserTrends(analyticsData.userTrends);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Analytics & Trends
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Institution Growth */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0', pb: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Institution Growth
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {institutionData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available for this period
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={institutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={3}
                    name="New Institutions"
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Department Growth */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0', pb: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Department Growth
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {departmentData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available for this period
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ec4899"
                    strokeWidth={3}
                    name="New Departments"
                    dot={{ fill: '#ec4899', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* User Growth by Role */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0', pb: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              User Growth by Role
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {userData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available for this period
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={userData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                  <Bar dataKey="student" fill="#10b981" name="Students" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teacher" fill="#06b6d4" name="Teachers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="admin" fill="#f59e0b" name="Admins" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="super_admin" fill="#6366f1" name="Super Admins" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsCharts;
