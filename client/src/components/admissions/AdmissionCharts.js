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
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getAdmissionAnalytics } from '../../services/admissionService';

const COLORS = {
  pending: '#ff9800',
  struckoff: '#e91e63', // Pinkish red for Struck Off
  passout: '#4caf50',
  enrolled: '#667eea',
  cancelled: '#9e9e9e',
};


const AdmissionCharts = ({ filters = {} }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days, filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const analytics = await getAdmissionAnalytics({
        ...filters,
        days,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAnalyticsData(analytics.data);
    } catch (err) {
      console.error('Admission analytics error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch analytics';
      setError(errorMessage);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatStatusTrends = (trends) => {
    if (!trends || trends.length === 0) return [];

    const grouped = {};
    trends.forEach((item) => {
      const date = item.date;
      const status = item.status;

      if (!grouped[date]) {
        grouped[date] = {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }
      grouped[date][status] = item.count;
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
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Please ensure your account has an institution assigned, or contact your administrator.
        </Typography>
      </Alert>
    );
  }

  if (!analyticsData) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No analytics data available. This might be because there are no admissions yet, or your account needs to be assigned to an institution.
      </Alert>
    );
  }

  const statusTrendsData = formatStatusTrends(analyticsData.statusTrends);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Admission Analytics & Insights
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
            <MenuItem value={180}>Last 6 months</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>


        {/* Status Breakdown Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Applications by Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {analyticsData.statusBreakdown.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count, percent }) =>
                      `${status.replace('_', ' ').toUpperCase()}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.status] || '#9e9e9e'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percent = (payload[0].percent || 0) * 100;
                        const rawStatus = data.status || 'unknown';
                        const statusLabel = rawStatus
                          .split('_')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ');

                        return (
                          <Box sx={{ bgcolor: 'white', p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {statusLabel}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Applications: {data.count}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Share: {percent.toFixed(1)}%
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Gender Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Applications by Gender
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {analyticsData.genderBreakdown.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.genderBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gender" style={{ fontSize: '12px' }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f093fb" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Application Trends Over Time */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Application Trends Over Time
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {analyticsData.applicationTrends.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available for this period
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.applicationTrends.map(item => ({
                  date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  count: item.count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    strokeWidth={2}
                    name="Applications"
                    dot={{ fill: '#667eea' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Status Trends Over Time */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Status Trends Over Time
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {statusTrendsData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available for this period
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statusTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    stroke={COLORS.pending}
                    strokeWidth={2}
                    name="Pending"
                    dot={{ fill: COLORS.pending }}
                  />
                  <Line
                    type="monotone"
                    dataKey="struckoff"
                    stroke={COLORS.struckoff}
                    strokeWidth={2}
                    name="Struck Off"
                    dot={{ fill: COLORS.struckoff }}
                  />
                  <Line
                    type="monotone"
                    dataKey="passout"
                    stroke={COLORS.passout}
                    strokeWidth={2}
                    name="Pass Out"
                    dot={{ fill: COLORS.passout }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrolled"
                    stroke={COLORS.enrolled}
                    strokeWidth={2}
                    name="Enrolled"
                    dot={{ fill: COLORS.enrolled }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>



        {/* Student Strength Class Wise */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Student Strength Class Wise - Current School
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {!analyticsData.classWiseStrength || analyticsData.classWiseStrength.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No data available
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.classWiseStrength}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="className" angle={-45} textAnchor="end" height={100} style={{ fontSize: '12px' }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#43e97b" name="Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>




      </Grid>
    </Box>
  );
};

export default AdmissionCharts;

