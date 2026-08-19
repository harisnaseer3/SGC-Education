import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
  InputAdornment
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Person as PersonIcon,
  Storage as ResourceIcon,
  Bolt as ActionIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const ACTION_COLORS = {
  create: 'success',
  update: 'info',
  delete: 'error',
  login: 'primary',
  logout: 'secondary',
  activate: 'success',
  deactivate: 'warning',
  toggle_status: 'info',
  change_password: 'warning',
  bulk_import: 'info',
  bulk_export: 'info',
  other: 'default'
};

const STATUS_ICONS = {
  success: <CheckCircleIcon color="success" fontSize="small" />,
  failed: <ErrorIcon color="error" fontSize="small" />,
  pending: <PendingIcon color="action" fontSize="small" />
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 25,
    total: 0
  });

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchLogs = useCallback(async (pageIndex = pagination.page, limitSize = pagination.limit) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', pageIndex + 1);
      params.append('limit', limitSize);

      if (actionFilter) params.append('action', actionFilter);
      if (resourceFilter) params.append('resource', resourceFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await axios.get(
        `${getApiUrl('activity-logs')}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        let fetchedLogs = res.data.logs || [];

        // Client search by user name/email if specified
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          fetchedLogs = fetchedLogs.filter(log =>
            log.user?.name?.toLowerCase().includes(q) ||
            log.user?.email?.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q) ||
            log.ipAddress?.toLowerCase().includes(q)
          );
        }

        setLogs(fetchedLogs);
        setPagination(prev => ({
          ...prev,
          page: pageIndex,
          limit: limitSize,
          total: res.data.pagination?.total || fetchedLogs.length
        }));
      }
    } catch (err) {
      console.error('Failed to fetch activity logs', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, statusFilter, startDate, endDate, searchQuery, pagination.page, pagination.limit]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(getApiUrl('activity-logs/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch log stats', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs(0, pagination.limit);
    fetchStats();
  }, [actionFilter, resourceFilter, statusFilter, startDate, endDate]);

  const handlePageChange = (event, newPage) => {
    fetchLogs(newPage, pagination.limit);
  };

  const handleRowsPerPageChange = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchLogs(0, newLimit);
  };

  const handleResetFilters = () => {
    setActionFilter('');
    setResourceFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'rgba(102, 126, 234, 0.12)', p: 1.2, borderRadius: 2, display: 'flex' }}>
            <HistoryIcon sx={{ color: '#667eea', fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              System Activity Logs
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Track user activities, authentication events, and administrative actions across the platform.
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => { fetchLogs(0, pagination.limit); fetchStats(); }}
          sx={{ borderRadius: 2 }}
        >
          Refresh Logs
        </Button>
      </Box>

      {/* Analytics Mini Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                      Top Action Type
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#667eea' }}>
                      {stats.actionBreakdown?.[0]?._id?.toUpperCase() || 'N/A'} ({stats.actionBreakdown?.[0]?.count || 0})
                    </Typography>
                  </Box>
                  <ActionIcon sx={{ color: '#667eea', opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                      Most Active Resource
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#764ba2' }}>
                      {stats.resourceBreakdown?.[0]?._id?.toUpperCase() || 'N/A'} ({stats.resourceBreakdown?.[0]?.count || 0})
                    </Typography>
                  </Box>
                  <ResourceIcon sx={{ color: '#764ba2', opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                      Total Filtered Logs
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#10b981' }}>
                      {pagination.total} Records
                    </Typography>
                  </Box>
                  <PersonIcon sx={{ color: '#10b981', opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Toolbar */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Filter & Search Logs
            </Typography>
          </Box>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search user, IP, or detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="activate">Activate</MenuItem>
                <MenuItem value="deactivate">Deactivate</MenuItem>
                <MenuItem value="change_password">Password Change</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Resource"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
              >
                <MenuItem value="">All Resources</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="institution">Campus / Institution</MenuItem>
                <MenuItem value="course">Course / Class</MenuItem>
                <MenuItem value="setting">Setting</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                size="medium"
                onClick={handleResetFilters}
                sx={{ height: 40, borderRadius: 2 }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: 'rgba(244, 246, 248, 0.8)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                    Loading activity logs...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    No Activity Logs Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    Try adjusting your filters or search criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {formatDate(log.createdAt)}
                  </TableCell>

                  <TableCell>
                    {log.user ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {log.user.name || 'User'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {log.user.email} {log.user.role ? `(${log.user.role})` : ''}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.disabled', italic: true }}>
                        System / Unknown
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={log.action || 'other'}
                      size="small"
                      color={ACTION_COLORS[log.action] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                      {log.resource || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={log.details}>
                      {log.details || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {log.ipAddress || 'N/A'}
                  </TableCell>

                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                      {STATUS_ICONS[log.status] || STATUS_ICONS.success}
                      <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {log.status || 'success'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="View Detailed Payload">
                      <IconButton size="small" color="primary" onClick={() => handleViewDetails(log)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Log Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee' }}>
          Activity Log Details
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedLog && (
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    PERFORMED BY
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedLog.user?.name} ({selectedLog.user?.email})
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Role: {selectedLog.user?.role || 'N/A'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    DATE & TIME
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatDate(selectedLog.createdAt)}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    ACTION
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedLog.action}
                      size="small"
                      color={ACTION_COLORS[selectedLog.action] || 'default'}
                    />
                  </Box>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    RESOURCE
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {selectedLog.resource}
                  </Typography>
                </Grid>

                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    IP ADDRESS
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedLog.ipAddress || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  DESCRIPTION
                </Typography>
                <Typography variant="body2" sx={{ bgcolor: 'rgba(0,0,0,0.03)', p: 1.5, borderRadius: 2, mt: 0.5 }}>
                  {selectedLog.details || 'No description provided'}
                </Typography>
              </Box>

              {selectedLog.userAgent && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    USER AGENT
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.03)', p: 1.5, borderRadius: 2, mt: 0.5 }}>
                    {selectedLog.userAgent}
                  </Typography>
                </Box>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    METADATA / PAYLOAD
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mt: 0.5,
                      bgcolor: '#1e1e1e',
                      color: '#d4d4d4',
                      fontFamily: 'Consolas, monospace',
                      fontSize: '0.82rem',
                      overflowX: 'auto',
                      borderRadius: 2
                    }}
                  >
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setDetailsOpen(false)} sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
