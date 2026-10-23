import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Security,
  Save,
  Close,
  Search,
  SelectAll,
  Deselect,
  Dashboard as DashboardIcon,
  People,
  AccountBalance,
  PersonAdd,
  Business,
  School,
  Payment,
  Assessment,
  Settings,
  BarChart,
  EventAvailable
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { PERMISSIONS } from '../utils/constants';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('roles'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRole(null);
    setPermissionSearch('');
    setError('');
  };

  const handlePermissionToggle = (permission) => {
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      if (editingRole) {
        await axios.put(getApiUrl(`roles/${editingRole._id}`), formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Role updated successfully');
      } else {
        await axios.post(getApiUrl('roles'), formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Role created successfully');
      }
      handleClose();
      fetchRoles();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(getApiUrl(`roles/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete role');
    }
  };

  // Group permissions for cleaner UI
  const permissionGroups = Object.entries(PERMISSIONS).map(([group, perms]) => ({
    name: group,
    permissions: Object.values(perms)
  }));

  const allSystemPermissions = Object.values(PERMISSIONS).flatMap(group => Object.values(group));

  const formatPermissionLabel = (perm) => {
    const action = perm.split(':')[1] || perm;
    if (action === 'stats') return 'View Stats';
    return action
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const groupMeta = {
    DASHBOARD: { icon: <DashboardIcon sx={{ fontSize: 18 }} />, color: '#6366f1', label: 'Dashboard' },
    USERS: { icon: <People sx={{ fontSize: 18 }} />, color: '#3b82f6', label: 'Users & Permissions' },
    INSTITUTIONS: { icon: <AccountBalance sx={{ fontSize: 18 }} />, color: '#0ea5e9', label: 'Institutions' },
    ADMISSIONS: { icon: <PersonAdd sx={{ fontSize: 18 }} />, color: '#10b981', label: 'Admissions' },
    ORGANIZATIONS: { icon: <Business sx={{ fontSize: 18 }} />, color: '#8b5cf6', label: 'Organizations' },
    ACADEMIC: { icon: <School sx={{ fontSize: 18 }} />, color: '#f59e0b', label: 'Academic Setup' },
    FEES: { icon: <Payment sx={{ fontSize: 18 }} />, color: '#14b8a6', label: 'Fee Management' },
    RESULTS: { icon: <Assessment sx={{ fontSize: 18 }} />, color: '#ec4899', label: 'Results' },
    SYSTEM: { icon: <Settings sx={{ fontSize: 18 }} />, color: '#64748b', label: 'System Settings' },
    REPORTS: { icon: <BarChart sx={{ fontSize: 18 }} />, color: '#84cc16', label: 'Reports' },
    ATTENDANCE: { icon: <EventAvailable sx={{ fontSize: 18 }} />, color: '#f97316', label: 'Attendance' },
  };

  const handleGroupToggle = (groupPerms) => {
    const allSelected = groupPerms.every(p => formData.permissions.includes(p));
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !groupPerms.includes(p))
      }));
    } else {
      const toAdd = groupPerms.filter(p => !formData.permissions.includes(p));
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, ...toAdd]
      }));
    }
  };

  const handleSelectAll = () => {
    setFormData(prev => ({ ...prev, permissions: [...allSystemPermissions] }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <Security color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Role Management</Typography>
            <Typography variant="body2" color="text.secondary">Configure dynamic roles and system-wide permissions</Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          Create New Role
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Permissions Count</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role._id} hover>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {role.name}
                  </Typography>
                </TableCell>
                <TableCell>{role.description || 'N/A'}</TableCell>
                <TableCell>
                  <Chip 
                    label={role.permissions.includes('*') ? 'ALL ACCESS' : `${role.permissions.length} Permissions`} 
                    size="small" 
                    color={role.permissions.includes('*') ? 'error' : 'primary'}
                    variant={role.permissions.includes('*') ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  {role.isSystemRole ? (
                    <Chip label="System" size="small" color="secondary" />
                  ) : (
                    <Chip label="Custom" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => handleOpen(role)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  {!role.isSystemRole && (
                    <IconButton color="error" onClick={() => handleDelete(role._id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Role Editor Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Security sx={{ fontSize: 26 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                {editingRole ? `Edit Role: ${editingRole.name.toUpperCase()}` : 'Create New Role'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {editingRole ? 'Configure granular system permissions for this role' : 'Define role name and assign capabilities'}
              </Typography>
            </Box>
            {editingRole && (
              <Chip
                label={editingRole.isSystemRole ? 'System Role' : 'Custom Role'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.22)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  ml: 1
                }}
              />
            )}
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: 3,
            bgcolor: '#f8fafc',
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { bgcolor: '#f1f5f9' },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '4px' }
          }}
        >
          {/* Top Form Section: Role Info Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Typography variant="subtitle2" fontWeight="700" color="#334155" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Role Information
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Role Identifier"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={editingRole?.isSystemRole}
                  placeholder="e.g. librarian, exam_controller"
                  helperText={editingRole?.isSystemRole ? "System role identifiers are permanent" : "Lowercase recommended"}
                  InputProps={{
                    sx: { borderRadius: 2, bgcolor: editingRole?.isSystemRole ? '#f1f5f9' : 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description / Purpose"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of duties and permissions"
                  InputProps={{
                    sx: { borderRadius: 2, bgcolor: 'white' }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Permissions Matrix Header */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="h6" fontWeight="800" color="#1e293b">
                  Permissions Matrix
                </Typography>
                <Chip
                  label={`${formData.permissions.length} / ${allSystemPermissions.length} Granted`}
                  size="small"
                  color={formData.permissions.length > 0 ? "primary" : "default"}
                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                />
              </Box>

              {!editingRole?.permissions.includes('*') && (
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Search permissions..."
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      sx: {
                        height: 36,
                        fontSize: '0.82rem',
                        bgcolor: '#f8fafc',
                        borderRadius: 2
                      }
                    }}
                    sx={{ width: { xs: '100%', sm: 220 } }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SelectAll sx={{ fontSize: 16 }} />}
                    onClick={handleSelectAll}
                    sx={{ textTransform: 'none', borderRadius: 2, height: 36, fontWeight: 600 }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Deselect sx={{ fontSize: 16 }} />}
                    onClick={handleDeselectAll}
                    sx={{ textTransform: 'none', borderRadius: 2, height: 36, fontWeight: 600, color: '#64748b', borderColor: '#cbd5e1' }}
                  >
                    Clear All
                  </Button>
                </Box>
              )}
            </Box>

            {editingRole?.permissions.includes('*') ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <strong>Global Administrator ('*'):</strong> This role has unrestricted super-admin privileges. Individual permission toggles are automatically superseded.
              </Alert>
            ) : (
              /* Balanced Responsive CSS Grid */
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)'
                  },
                  gap: 2,
                  alignItems: 'start'
                }}
              >
                {permissionGroups.map((group) => {
                  const meta = groupMeta[group.name] || {
                    icon: <Security sx={{ fontSize: 18 }} />,
                    color: '#667eea',
                    label: group.name
                  };

                  // Filter permissions by search query if present
                  const filteredPerms = group.permissions.filter(perm => {
                    if (!permissionSearch) return true;
                    const searchLower = permissionSearch.toLowerCase();
                    const groupMatch = group.name.toLowerCase().includes(searchLower);
                    const permMatch = perm.toLowerCase().includes(searchLower);
                    const labelMatch = formatPermissionLabel(perm).toLowerCase().includes(searchLower);
                    return groupMatch || permMatch || labelMatch;
                  });

                  if (filteredPerms.length === 0) return null;

                  const selectedCount = group.permissions.filter(p => formData.permissions.includes(p)).length;
                  const isAllGroupSelected = selectedCount === group.permissions.length;

                  return (
                    <Paper
                      key={group.name}
                      elevation={0}
                      sx={{
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: selectedCount > 0 ? `${meta.color}50` : '#e2e8f0',
                        bgcolor: selectedCount > 0 ? `${meta.color}04` : '#ffffff',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: meta.color,
                          boxShadow: `0 6px 16px ${meta.color}15`
                        }
                      }}
                    >
                      {/* Card Group Header */}
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1.25,
                          bgcolor: selectedCount > 0 ? `${meta.color}12` : '#f8fafc',
                          borderBottom: '1px solid',
                          borderColor: selectedCount > 0 ? `${meta.color}25` : '#edf2f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => handleGroupToggle(group.permissions)}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box sx={{ color: meta.color, display: 'flex', alignItems: 'center' }}>
                            {meta.icon}
                          </Box>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              color: '#1e293b'
                            }}
                          >
                            {meta.label}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Chip
                            label={`${selectedCount}/${group.permissions.length}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              bgcolor: selectedCount === group.permissions.length
                                ? meta.color
                                : selectedCount > 0
                                ? `${meta.color}20`
                                : '#e2e8f0',
                              color: selectedCount === group.permissions.length
                                ? '#ffffff'
                                : selectedCount > 0
                                ? meta.color
                                : '#64748b'
                            }}
                          />
                          <Tooltip title={isAllGroupSelected ? "Deselect Group" : "Select All in Group"} arrow>
                            <Checkbox
                              size="small"
                              checked={isAllGroupSelected}
                              indeterminate={selectedCount > 0 && selectedCount < group.permissions.length}
                              onChange={() => handleGroupToggle(group.permissions)}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.25,
                                color: meta.color,
                                '&.Mui-checked': { color: meta.color },
                                '&.MuiCheckbox-indeterminate': { color: meta.color }
                              }}
                            />
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Card Permission Checkboxes */}
                      <Box sx={{ p: 1 }}>
                        {filteredPerms.map((perm) => {
                          const isChecked = formData.permissions.includes(perm);
                          return (
                            <Box
                              key={perm}
                              onClick={() => handlePermissionToggle(perm)}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                bgcolor: isChecked ? `${meta.color}0c` : 'transparent',
                                '&:hover': {
                                  bgcolor: isChecked ? `${meta.color}15` : '#f1f5f9'
                                }
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={() => handlePermissionToggle(perm)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.5,
                                  mr: 0.75,
                                  color: '#cbd5e1',
                                  '&.Mui-checked': { color: meta.color }
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: '0.82rem',
                                  fontWeight: isChecked ? 600 : 400,
                                  color: isChecked ? '#0f172a' : '#475569',
                                  userSelect: 'none'
                                }}
                              >
                                {formatPermissionLabel(perm)}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            💡 Changes take effect immediately upon saving and apply on next user interaction.
          </Typography>
          <Box display="flex" gap={1.5}>
            <Button
              onClick={handleClose}
              startIcon={<Close />}
              variant="outlined"
              sx={{ borderRadius: 2, px: 2.5, textTransform: 'none', color: '#64748b', borderColor: '#cbd5e1' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              sx={{
                px: 3.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd6 0%, #683f94 100%)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)'
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Role Configuration'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoleManagement;
