import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Alert,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Edit,
  PowerSettingsNew,
  Delete,
  PersonAdd,
  Key,
  SwitchAccount,
  ContentCopy,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Security,
  WarningAmber
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import PageHeader from '../components/layout/PageHeader';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { useTablePagination } from '../hooks/useTablePagination';
import usePermissions from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/constants';

const Users = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const pagination = useTablePagination(12);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roles, setRoles] = useState([]); // Dynamic roles state

  // Developer check & recovery states (strictly for harisnaseer3@gmail.com)
  const DEVELOPER_EMAIL = 'harisnaseer3@gmail.com';
  const isDeveloper = Boolean((currentUser.email || '').trim().toLowerCase() === DEVELOPER_EMAIL);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);

  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateUser, setImpersonateUser] = useState(null);
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRoles(); // Fetch roles for filter
    if (currentUser.role === 'super_admin') {
      fetchInstitutions();
    }
  }, [search, roleFilter, institutionFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (institutionFilter) params.append('institution', institutionFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await axios.get(
        `${getApiUrl('users')}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setUsers(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('roles'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data.data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`users/${userId}/toggle-status`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const handleEdit = (userId) => {
    navigate(`/users/edit/${userId}`);
  };

  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      setDeleteError('');
      const token = localStorage.getItem('token');
      await axios.delete(getApiUrl(`users/${userToDelete._id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to permanently delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Developer Handlers
  const handleOpenResetModal = (user) => {
    setSelectedUser(user);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewPassword(`Sgc@${randomSuffix}`);
    setResetMessage({ type: '', text: '' });
    setCopied(false);
    setShowPassword(false);
    setResetModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewPassword(`Sgc@${randomSuffix}`);
    setCopied(false);
  };

  const handleCopyCredentials = () => {
    if (!selectedUser) return;
    const credText = `SGCEducation Account Recovery\nName: ${selectedUser.name}\nEmail / Username: ${selectedUser.email}\nTemporary Password: ${newPassword}\nRole: ${selectedUser.role}`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExecuteResetPassword = async () => {
    if (!newPassword || newPassword.trim().length < 6) {
      setResetMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    try {
      setResetLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        getApiUrl(`developer/reset-password/${selectedUser._id}`),
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResetMessage({
        type: 'success',
        text: `Password successfully updated for ${selectedUser.name}! You can copy and send credentials below.`
      });
    } catch (err) {
      setResetMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to reset password'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleOpenImpersonate = (user) => {
    setImpersonateUser(user);
    setImpersonateModalOpen(true);
  };

  const handleExecuteImpersonate = async () => {
    try {
      setImpersonateLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        getApiUrl(`developer/impersonate/${impersonateUser._id}`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Save developer original session
      localStorage.setItem('developerSession', JSON.stringify({
        token,
        user: currentUser
      }));

      // Switch to impersonated user
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to impersonate user');
      setImpersonateModalOpen(false);
    } finally {
      setImpersonateLoading(false);
    }
  };


  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      case 'organization_admin':
        return 'secondary';
      case 'admission_officer':
        return 'warning';
      case 'finance_manager':
        return 'secondary';
      case 'teacher':
        return 'info';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'organization_admin':
        return 'Organization Admin';
      case 'admission_officer':
        return 'Admission Officer';
      case 'finance_manager':
        return 'Finance Manager';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return role ? role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
    }
  };

  return (
    <Box>
      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Users"
          subtitle="Manage system users and their permissions"
          breadcrumbs={[
            { label: 'Users', path: '/users' }
          ]}
          actions={
            hasPermission(PERMISSIONS.USERS.CREATE) && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/users/new')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Add User
              </Button>
            )
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: currentUser.role === 'super_admin' ? '2fr 1.5fr 2fr 1.2fr' : '2fr 1.5fr 1.2fr'
              },
              gap: 2,
              alignItems: 'center'
            }}
          >
            <TextField
              fullWidth
              label="Search"
              placeholder="Name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
            />
            <TextField
              fullWidth
              select
              label="Role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                if (e.target.value === 'super_admin') {
                  setInstitutionFilter('');
                }
              }}
              size="small"
              InputLabelProps={{
                shrink: true
              }}
              SelectProps={{
                displayEmpty: true
              }}
            >
              <MenuItem value="">All Roles</MenuItem>
              {roles.map((role) => {
                const isSuperAdminRole = role.name === 'super_admin';
                if (isSuperAdminRole && currentUser.role !== 'super_admin') return null;
                
                return (
                  <MenuItem key={role._id} value={role.name}>
                    {getRoleLabel(role.name)}
                  </MenuItem>
                );
              })}
            </TextField>
            {currentUser.role === 'super_admin' && (
              <TextField
                fullWidth
                select
                label="Institution"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                size="small"
                InputLabelProps={{
                  shrink: true
                }}
                SelectProps={{
                  displayEmpty: true
                }}
              >
                <MenuItem value="">All Institutions</MenuItem>
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              InputLabelProps={{
                shrink: true
              }}
              SelectProps={{
                displayEmpty: true
              }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
          </Box>
        </Paper>

        {/* Users Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Institution</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(users).map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>{capitalizeFirstOnly(user.name || 'N/A')}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.role === 'super_admin'
                          ? 'All Campuses'
                          : (user.role === 'organization_admin' || user.role === 'finance_manager')
                            ? `${capitalizeFirstOnly(user.organization?.name || 'Organization')} (All Campuses)`
                            : capitalizeFirstOnly(user.institution?.name || '-')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {hasPermission(PERMISSIONS.USERS.EDIT) && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(user._id)}
                            title="Edit User"
                          >
                            <Edit />
                          </IconButton>
                        )}
                        {hasPermission(PERMISSIONS.USERS.EDIT) && (
                          <IconButton
                            size="small"
                            color={user.isActive ? 'error' : 'success'}
                            onClick={() => handleToggleStatus(user._id)}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <PowerSettingsNew />
                          </IconButton>
                        )}
                        {(hasPermission(PERMISSIONS.USERS.DELETE) || currentUser.role === 'super_admin') && (
                          <Tooltip
                            title={
                              (user._id === (currentUser.id || currentUser._id) || (user.email || '').trim().toLowerCase() === DEVELOPER_EMAIL)
                                ? "Cannot delete this account"
                                : "Permanently Delete User"
                            }
                            arrow
                          >
                            <span>
                              <IconButton
                                size="small"
                                sx={{ color: '#d32f2f', ml: 0.5, '&:hover': { bgcolor: '#ffebee' } }}
                                onClick={() => handleOpenDeleteDialog(user)}
                                disabled={user._id === (currentUser.id || currentUser._id) || (user.email || '').trim().toLowerCase() === DEVELOPER_EMAIL}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {isDeveloper && (
                          <>
                            <Tooltip title="Developer: Quick Reset Password" arrow>
                              <IconButton
                                size="small"
                                sx={{ color: '#e65100', ml: 0.5, '&:hover': { bgcolor: '#ffe0b2' } }}
                                onClick={() => handleOpenResetModal(user)}
                              >
                                <Key fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={`Developer: Login As ${user.name}`} arrow>
                              <IconButton
                                size="small"
                                sx={{ color: '#6a1b9a', ml: 0.5, '&:hover': { bgcolor: '#e1bee7' } }}
                                onClick={() => handleOpenImpersonate(user)}
                              >
                                <SwitchAccount fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && users.length > 0 && (
              <TablePagination
                component="div"
                count={users.length}
                page={pagination.page}
                onPageChange={pagination.handleChangePage}
                rowsPerPage={pagination.rowsPerPage}
                onRowsPerPageChange={pagination.handleChangeRowsPerPage}
                rowsPerPageOptions={pagination.rowsPerPageOptions}
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
              />
            )}
          </TableContainer>
        </Paper>

        {/* Developer Modal: Quick Reset Password */}
        <Dialog
          open={resetModalOpen}
          onClose={() => !resetLoading && setResetModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Key />
            <Typography variant="h6" fontWeight="bold">Developer Master Recovery: Reset Password</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedUser && (
              <Box sx={{ mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Target User Profile</Typography>
                  <Typography variant="h6" fontWeight="bold">{selectedUser.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email / Username:</strong> {selectedUser.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Role:</strong> {getRoleLabel(selectedUser.role)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Campus / Org:</strong> {selectedUser.organization?.name || selectedUser.institution?.name || 'All Campuses'}
                  </Typography>
                </Paper>
              </Box>
            )}

            {resetMessage.text && (
              <Alert severity={resetMessage.type} sx={{ mb: 2 }}>
                {resetMessage.text}
              </Alert>
            )}

            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Set a temporary password (min 6 characters) to share with the user."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGeneratePassword}
              >
                Generate New Password
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={copied ? <CheckCircle color="success" /> : <ContentCopy />}
                onClick={handleCopyCredentials}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e0e0e0' }}>
            <Button
              onClick={() => setResetModalOpen(false)}
              disabled={resetLoading}
            >
              Close
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}
              onClick={handleExecuteResetPassword}
              disabled={resetLoading}
              startIcon={resetLoading ? <CircularProgress size={18} color="inherit" /> : <Key />}
            >
              {resetLoading ? 'Updating...' : 'Set Password'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Developer Modal: Impersonate User Confirmation */}
        <Dialog
          open={impersonateModalOpen}
          onClose={() => !impersonateLoading && setImpersonateModalOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwitchAccount />
            <Typography variant="h6" fontWeight="bold">Confirm Impersonation</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {impersonateUser && (
              <Box>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  Are you sure you want to log in as <strong>{impersonateUser.name}</strong>?
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f3e5f5', borderRadius: 2, mb: 2 }}>
                  <Typography variant="body2"><strong>Email:</strong> {impersonateUser.email}</Typography>
                  <Typography variant="body2"><strong>Role:</strong> {getRoleLabel(impersonateUser.role)}</Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary">
                  💡 You will see and operate the system under their exact permissions. A persistent banner will appear at the top allowing you to exit and return to developer mode anytime.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setImpersonateModalOpen(false)}
              disabled={impersonateLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#6a1b9a', '&:hover': { bgcolor: '#4a148c' } }}
              onClick={handleExecuteImpersonate}
              disabled={impersonateLoading}
              startIcon={impersonateLoading ? <CircularProgress size={18} color="inherit" /> : <SwitchAccount />}
            >
              {impersonateLoading ? 'Logging In...' : 'Log In As User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Permanent Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f' }}>
            <WarningAmber color="error" />
            <Typography variant="h6" fontWeight="bold">Delete User Permanently?</Typography>
          </DialogTitle>
          <DialogContent>
            {deleteError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {deleteError}
              </Alert>
            )}
            <Typography variant="body2" sx={{ mb: 1.5, color: '#444' }}>
              Are you sure you want to permanently delete user <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
            </Typography>
            <Alert severity="warning" sx={{ fontSize: '0.82rem' }}>
              <strong>Warning:</strong> This action cannot be undone. All credentials and records associated directly with this user will be removed.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              variant="contained"
              color="error"
              startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Users;
