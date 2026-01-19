import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Badge
} from '@mui/material';
import {
  AccountCircle,
  School,
  ExitToApp,
  Settings,
  Notifications as NotificationsIcon,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Campaign,
  Delete,
  DoneAll,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const Notifications = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [currentTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const isRead = currentTab === 0 ? '' : currentTab === 1 ? 'false' : 'true';

      const response = await axios.get(
        `${getApiUrl('notifications')}${isRead ? `?isRead=${isRead}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setNotifications(response.data.notifications);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl('notifications/unread-count'),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUnreadCount(response.data.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch unread count');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`notifications/${notificationId}/read`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      setError('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl('notifications/mark-all-read'),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess('All notifications marked as read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      setError('Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl(`notifications/${notificationId}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess('Notification deleted');
      fetchNotifications();
    } catch (err) {
      setError('Failed to delete notification');
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl('notifications/read'),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess('All read notifications deleted');
      fetchNotifications();
    } catch (err) {
      setError('Failed to delete read notifications');
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#43e97b' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ffa726' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ff6161' }} />;
      case 'announcement':
        return <Campaign sx={{ color: '#667eea' }} />;
      default:
        return <Info sx={{ color: '#4facfe' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#43e97b20';
      case 'warning':
        return '#ffa72620';
      case 'error':
        return '#ff616120';
      case 'announcement':
        return '#667eea20';
      default:
        return '#4facfe20';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <School sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SGC Education - Notifications
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user.name}</Typography>
            <IconButton size="large" onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={() => navigate('/dashboard')}>Dashboard</MenuItem>
              <MenuItem onClick={() => navigate('/profile')}>
                <Settings sx={{ mr: 1 }} fontSize="small" />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DoneAll />}
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Delete />}
              onClick={handleDeleteAllRead}
              color="error"
            >
              Delete Read
            </Button>
            <IconButton onClick={fetchNotifications}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Alerts */}
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="All" />
            <Tab
              label={
                <Badge badgeContent={unreadCount} color="error">
                  Unread
                </Badge>
              }
            />
            <Tab label="Read" />
          </Tabs>
        </Paper>

        {/* Notifications List */}
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.isRead ? 'transparent' : '#f0f7ff',
                      '&:hover': { bgcolor: '#fafafa' },
                      px: 3,
                      py: 2
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getNotificationColor(notification.type) }}>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" fontWeight={notification.isRead ? 400 : 600}>
                            {notification.title}
                          </Typography>
                          <Chip
                            label={notification.type}
                            size="small"
                            sx={{
                              textTransform: 'capitalize',
                              height: 20,
                              fontSize: '0.7rem'
                            }}
                          />
                          {!notification.isRead && (
                            <Chip label="New" color="primary" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!notification.isRead && (
                        <IconButton
                          size="small"
                          onClick={() => handleMarkAsRead(notification._id)}
                          color="primary"
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteNotification(notification._id)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Notifications;
