import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Save, ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    institution: '',
    department: '',
    phone: '',
  });

  useEffect(() => {
    // Set default institution for non-super admins
    if (!isSuperAdmin && currentUser.institution) {
      setFormData(prev => ({
        ...prev,
        institution: currentUser.institution._id || currentUser.institution
      }));
    }

    fetchInstitutions();
    fetchDepartments();

    if (isEditMode) {
      fetchUser();
    }
  }, [id]);

  useEffect(() => {
    // Filter departments by selected institution
    if (formData.institution) {
      const filtered = allDepartments.filter(
        dept => dept.institution._id === formData.institution || dept.institution === formData.institution
      );
      setDepartments(filtered);
    } else {
      setDepartments(allDepartments);
    }
  }, [formData.institution, allDepartments]);

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllDepartments(response.data.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchUser = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/users/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const userData = response.data.data;
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        password: '',
        confirmPassword: '',
        role: userData.role || 'student',
        institution: userData.institution?._id || userData.institution || '',
        department: userData.department?._id || userData.department || '',
        phone: userData.phone || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear department if institution changes
    if (name === 'institution') {
      setFormData(prev => ({
        ...prev,
        institution: value,
        department: ''
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.role) {
      setError('Please fill in all required fields');
      return false;
    }

    if (!isEditMode) {
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    } else if (formData.password) {
      // If updating password in edit mode
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Prepare data - remove confirmPassword and empty password (in edit mode)
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      if (isEditMode && !submitData.password) {
        delete submitData.password;
      }

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/users/${id}`,
          submitData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('User updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/users',
          submitData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('User created successfully!');
      }

      setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/users')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight="bold">
            {isEditMode ? 'Edit User' : 'Add New User'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Basic Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  label="Role"
                >
                  {isSuperAdmin && (
                    <MenuItem value="super_admin">Super Admin</MenuItem>
                  )}
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="student">Student</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required={formData.role !== 'super_admin'}>
                <InputLabel>Institution</InputLabel>
                <Select
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  label="Institution"
                  disabled={!isSuperAdmin}
                >
                  {institutions.map((inst) => (
                    <MenuItem key={inst._id} value={inst._id}>
                      {inst.name} ({inst.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  label="Department"
                  disabled={!formData.institution}
                >
                  <MenuItem value="">None</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            {isEditMode ? 'Change Password (Optional)' : 'Password'}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required={!isEditMode}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={isEditMode ? "Leave blank to keep current password" : "Minimum 6 characters"}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required={!isEditMode || formData.password}
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Submit Button */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/users')}
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserForm;
