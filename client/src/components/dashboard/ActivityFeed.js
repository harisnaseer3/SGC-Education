import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PersonAdd,
  Edit,
  Delete,
  School,
  Business,
  Login,
  Logout,
  CheckCircle,
  Cancel,
  Refresh
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../../config/api';

const ActivityFeed = ({ limit = 10 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Build URL with institution parameter if available
      let url = `${getApiUrl('activity-logs/recent')}?limit=${limit}`;
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
      setActivities(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return <PersonAdd sx={{ color: '#43e97b' }} />;
      case 'update':
        return <Edit sx={{ color: '#4facfe' }} />;
      case 'delete':
        return <Delete sx={{ color: '#ff6161' }} />;
      case 'login':
        return <Login sx={{ color: '#667eea' }} />;
      case 'logout':
        return <Logout sx={{ color: '#999' }} />;
      case 'activate':
        return <CheckCircle sx={{ color: '#43e97b' }} />;
      case 'deactivate':
        return <Cancel sx={{ color: '#ff6161' }} />;
      default:
        return <School sx={{ color: '#667eea' }} />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'error';
      case 'activate':
        return 'success';
      case 'deactivate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInSeconds = Math.floor((now - activityDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return activityDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e0e0e0', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Recent Activity
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchActivities}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {activities.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No recent activities
        </Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {activities.map((activity, index) => (
            <React.Fragment key={activity._id}>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  alignItems: 'flex-start',
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
                }}
              >
                <ListItemAvatar sx={{ mt: 0.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${getActionColor(activity.action) === 'success' ? '#43e97b' :
                                   getActionColor(activity.action) === 'error' ? '#ff6161' :
                                   getActionColor(activity.action) === 'info' ? '#4facfe' : '#667eea'}15`,
                      width: 44,
                      height: 44,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    {React.cloneElement(getActionIcon(activity.action), { sx: { fontSize: 22 } })}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'text.primary'
                        }}
                      >
                        {activity.user?.name || 'Unknown User'}
                      </Typography>
                      <Chip
                        label={activity.action}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          bgcolor: `${getActionColor(activity.action)}.main`,
                          color: 'white'
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, opacity: 0.8 }}>
                        {formatTime(activity.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ 
                      bgcolor: '#f8fafc', 
                      p: 1.5, 
                      borderRadius: 2, 
                      border: '1px solid #edf2f7',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -6,
                        top: 10,
                        width: 12,
                        height: 12,
                        bgcolor: '#f8fafc',
                        borderLeft: '1px solid #edf2f7',
                        borderBottom: '1px solid #edf2f7',
                        transform: 'rotate(45deg)'
                      }
                    }}>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}
                      >
                        {activity.details}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Chip
                          label={activity.resource}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            textTransform: 'capitalize',
                            borderColor: '#e2e8f0',
                            color: 'text.secondary',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ActivityFeed;
