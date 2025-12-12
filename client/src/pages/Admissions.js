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
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Search,
  Visibility,
  CheckCircle,
  Cancel,
  PersonAdd,
  School,
  PendingActions,
  AssignmentTurnedIn,
  AssignmentLate,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAllAdmissions, getAdmissionStats, updateAdmissionStatus, approveAndEnroll, rejectAdmission } from '../services/admissionService';
import axios from 'axios';

const Admissions = () => {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', remarks: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'super_admin' || user.role === 'admin' || user.role === 'school_admin';

  useEffect(() => {
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData && !selectedInstitution) {
      try {
        const institution = JSON.parse(institutionData);
        setSelectedInstitution(institution._id);
        return;
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    }
    fetchData();
  }, [selectedInstitution, selectedDepartment, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch institutions if super admin
      if (isSuperAdmin) {
        const instResponse = await axios.get('http://localhost:5000/api/v1/institutions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInstitutions(instResponse.data.data);
      }

      // Fetch departments
      if (selectedInstitution) {
        const deptResponse = await axios.get(`http://localhost:5000/api/v1/departments?institution=${selectedInstitution}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartments(deptResponse.data.data);
      }

      // Fetch admissions
      const filters = {};
      if (selectedInstitution) filters.institution = selectedInstitution;
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedStatus) filters.status = selectedStatus;
      if (searchTerm) filters.search = searchTerm;

      const admissionsData = await getAllAdmissions(filters);
      setAdmissions(admissionsData.data);

      // Fetch stats
      const statsFilters = {};
      if (selectedInstitution) statsFilters.institution = selectedInstitution;
      const statsData = await getAdmissionStats(statsFilters);
      setStats(statsData.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admissions');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type) => {
    try {
      if (type === 'approve') {
        await updateAdmissionStatus(selectedAdmission._id, 'approved', actionDialog.remarks);
      } else if (type === 'reject') {
        await rejectAdmission(selectedAdmission._id, actionDialog.remarks);
      } else if (type === 'enroll') {
        await approveAndEnroll(selectedAdmission._id);
      } else if (type === 'review') {
        await updateAdmissionStatus(selectedAdmission._id, 'under_review', actionDialog.remarks);
      }

      setActionDialog({ open: false, type: '', remarks: '' });
      setSelectedAdmission(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${type} admission`);
    }
  };

  const openActionDialog = (admission, type) => {
    setSelectedAdmission(admission);
    setActionDialog({ open: true, type, remarks: '' });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      under_review: 'info',
      approved: 'success',
      rejected: 'error',
      enrolled: 'primary',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const filteredAdmissions = admissions.filter((admission) =>
    admission.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admission.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admission.contactInfo.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Applications</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.totalApplications || 0}</Typography>
                </Box>
                <School sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Pending</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.pendingApplications || 0}</Typography>
                </Box>
                <PendingActions sx={{ fontSize: 40, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Approved</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.approvedApplications || 0}</Typography>
                </Box>
                <AssignmentTurnedIn sx={{ fontSize: 40, color: '#4caf50', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Enrolled</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.enrolledApplications || 0}</Typography>
                </Box>
                <PersonAdd sx={{ fontSize: 40, color: '#2196f3', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Admissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage student admission applications
            </Typography>
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/admissions/new')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              New Application
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField
            fullWidth
            placeholder="Search by application number, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: '200px' }}
          />

          {isSuperAdmin && (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Institution</InputLabel>
              <Select
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setSelectedDepartment('');
                }}
                label="Institution"
              >
                <MenuItem value="">All Institutions</MenuItem>
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Department"
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept._id} value={dept._id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="enrolled">Enrolled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Application No.</strong></TableCell>
                <TableCell><strong>Applicant Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                {isSuperAdmin && <TableCell><strong>Institution</strong></TableCell>}
                <TableCell><strong>Department</strong></TableCell>
                <TableCell><strong>Program</strong></TableCell>
                <TableCell><strong>Applied On</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 9 : 8} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No admissions found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmissions.map((admission) => (
                  <TableRow key={admission._id} hover>
                    <TableCell>
                      <Chip label={admission.applicationNumber} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.fullName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.contactInfo.email}</Typography>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Typography variant="body2">{admission.institution?.name}</Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2">{admission.department?.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.program}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(admission.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admission.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getStatusColor(admission.status)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/admissions/view/${admission._id}`)}
                        title="View Details"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {isAdmin && admission.status === 'pending' && (
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => openActionDialog(admission, 'review')}
                          title="Mark Under Review"
                        >
                          <PendingActions fontSize="small" />
                        </IconButton>
                      )}
                      {isAdmin && (admission.status === 'pending' || admission.status === 'under_review') && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openActionDialog(admission, 'approve')}
                            title="Approve"
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openActionDialog(admission, 'reject')}
                            title="Reject"
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {isAdmin && admission.status === 'approved' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openActionDialog(admission, 'enroll')}
                          title="Enroll Student"
                        >
                          <PersonAdd fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: '', remarks: '' })}>
        <DialogTitle>
          {actionDialog.type === 'approve' && 'Approve Admission'}
          {actionDialog.type === 'reject' && 'Reject Admission'}
          {actionDialog.type === 'enroll' && 'Enroll Student'}
          {actionDialog.type === 'review' && 'Mark Under Review'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Remarks"
            value={actionDialog.remarks}
            onChange={(e) => setActionDialog({ ...actionDialog, remarks: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: '', remarks: '' })}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(actionDialog.type)} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Admissions;
