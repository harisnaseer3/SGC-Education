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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Security,
  Save,
  Close,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { PERMISSIONS } from '../utils/constants';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
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
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingRole ? `Edit Role: ${editingRole.name.toUpperCase()}` : 'Create New Role'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Role Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={editingRole?.isSystemRole}
                placeholder="e.g., Librarian, Cashier"
                helperText={editingRole?.isSystemRole ? "System roles cannot be renamed" : "Alphanumeric, lowercase recommended"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Permissions Configuration</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assign specific capabilities to this role. Changes will take effect on next user login.
              </Typography>
              
              {editingRole?.permissions.includes('*') ? (
                <Alert severity="warning">This is a Super Admin role with global access ('*'). Individual permissions are ignored.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {permissionGroups.map((group) => (
                    <Grid item xs={12} sm={6} md={4} key={group.name}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase', color: 'primary.main' }}>
                          {group.name}
                        </Typography>
                        {group.permissions.map((perm) => (
                          <Box key={perm}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  size="small"
                                  checked={formData.permissions.includes(perm)}
                                  onChange={() => handlePermissionToggle(perm)}
                                />
                              }
                              label={<Typography variant="body2">{perm.split(':')[1] || perm}</Typography>}
                            />
                          </Box>
                        ))}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} startIcon={<Close />}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            startIcon={<Save />}
            sx={{ px: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Save Role Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoleManagement;
