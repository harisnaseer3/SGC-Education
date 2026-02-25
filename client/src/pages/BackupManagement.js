import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  Backup as BackupIcon,
  History as HistoryIcon,
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const BackupManagement = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const isSuperAdmin = user.role === 'super_admin';

  const [history, setHistory] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'full' | 'incremental' | null
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchHistory = useCallback(async (pg = page, rpp = rowsPerPage) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/backups/history?page=${pg + 1}&limit=${rpp}`, { headers });
      setHistory(res.data.data || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch backup history');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchHistory();
    }
  }, [isSuperAdmin, fetchHistory]);

  const handleDownloadBackup = async (type) => {
    try {
      setDownloading(type);
      setError('');
      setSuccess('');

      const response = await axios.post(
        `${API_BASE}/backups/download?type=${type}`,
        {},
        {
          headers,
          responseType: 'blob',
        }
      );

      // Check if response is JSON (means no changes for incremental)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        setSuccess(json.message || 'No changes found since last backup.');
        fetchHistory();
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const disposition = response.headers['content-disposition'];
      let filename = `sgceducation_backup_${type}_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      if (disposition) {
        // Robust regex to extract filename, handling quoted and unquoted names
        const match = disposition.match(/filename="?([^"]+)"?/) || disposition.match(/filename=([^;]+)/);
        if (match) filename = match[1].trim();
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`${type === 'full' ? 'Full' : 'Incremental'} backup downloaded successfully!`);
      fetchHistory();
    } catch (err) {
      let errorMessage = `Failed to download ${type} backup`;
      
      // If the response is a blob (which it is for this request), 
      // we need to read it as text to get the actual JSON error message
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error blob:', e);
        }
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const handleRestoreBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring a backup will overwrite existing data. Are you sure you want to proceed?')) {
      event.target.value = null;
      return;
    }

    try {
      setRestoring(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE}/backups/restore`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`Restore completed! Restored ${response.data.data.totalDocuments} documents across ${response.data.data.totalCollections} collections.`);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Restore failed. Please ensure the file is a valid backup ZIP.');
    } finally {
      setRestoring(false);
      event.target.value = null;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this backup log?')) return;

    try {
      setError('');
      await axios.delete(`${API_BASE}/backups/${id}`, { headers });
      setSuccess('Backup log deleted successfully');
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete backup log');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    fetchHistory(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    fetchHistory(0, newRowsPerPage);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Super Admin access required.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BackupIcon sx={{ color: '#667eea' }} />
          Backup & Restore Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage system data by downloading full/incremental backups or restoring from a previously saved backup file.
        </Typography>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Backup & Restore Actions */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Card sx={{ flex: 1, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <CloudDownloadIcon sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Full Backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download all system data as a ZIP file.
            </Typography>
            <Button
              variant="contained"
              startIcon={downloading === 'full' ? <CircularProgress size={20} color="inherit" /> : <GetAppIcon />}
              onClick={() => handleDownloadBackup('full')}
              disabled={!!downloading || restoring}
              sx={{
                bgcolor: '#667eea',
                '&:hover': { bgcolor: '#5a6fd6' },
                width: '100%',
              }}
            >
              {downloading === 'full' ? 'Preparing...' : 'Full Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <BackupIcon sx={{ fontSize: 48, color: '#43e97b', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Incremental
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Only data changed since last backup.
            </Typography>
            <Button
              variant="contained"
              startIcon={downloading === 'incremental' ? <CircularProgress size={20} color="inherit" /> : <GetAppIcon />}
              onClick={() => handleDownloadBackup('incremental')}
              disabled={!!downloading || restoring}
              sx={{
                bgcolor: '#43e97b',
                color: '#1a1a1a',
                '&:hover': { bgcolor: '#38d56f' },
                width: '100%',
              }}
            >
              {downloading === 'incremental' ? 'Preparing...' : 'Incremental'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, border: '1px solid #e0e0e0', boxShadow: 'none', bgcolor: '#fff9f9' }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <HistoryIcon sx={{ fontSize: 48, color: '#f44336', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Restore Backup
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a backup ZIP to restore data.
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={restoring ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
              disabled={!!downloading || restoring}
              sx={{
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': { borderColor: '#d32f2f', bgcolor: '#fff0f0' },
                width: '100%',
              }}
            >
              {restoring ? 'Restoring...' : 'Upload & Restore'}
              <input
                type="file"
                hidden
                accept=".zip"
                onChange={handleRestoreBackup}
              />
            </Button>
          </CardContent>
        </Card>
      </Stack>

      {/* Backup History */}
      <Paper sx={{ border: '1px solid #e0e0e0', boxShadow: 'none', overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fafafa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon sx={{ color: '#667eea' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Backup History
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchHistory} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f5f5f5' } }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Collections</TableCell>
                <TableCell align="center">Documents</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No backups yet. Click a button above to create your first backup.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((backup) => (
                  <TableRow key={backup._id} hover>
                    <TableCell>{formatDate(backup.completedAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={backup.type === 'full' ? 'Full' : 'Incremental'}
                        size="small"
                        sx={{
                          bgcolor: backup.type === 'full' ? '#e8eaff' : '#e6faf0',
                          color: backup.type === 'full' ? '#667eea' : '#2d8a56',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={backup.status === 'completed' ? 'Completed' : 'Failed'}
                        size="small"
                        sx={{
                          bgcolor: backup.status === 'completed' ? '#d4edda' : '#f8d7da',
                          color: backup.status === 'completed' ? '#155724' : '#721c24',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {backup.collectionsBackedUp?.length || 0}
                    </TableCell>
                    <TableCell align="center">
                      {backup.totalDocuments?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      {backup.createdBy?.name || backup.createdBy?.email || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete log">
                        <IconButton
                          onClick={() => handleDelete(backup._id)}
                          size="small"
                          sx={{ color: '#e53935' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[12, 25, 50]}
        />
      </Paper>
    </Box>
  );
};

export default BackupManagement;
