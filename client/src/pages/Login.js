import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School,
  Email,
  Lock,
  Business,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: credentials, 2: organization selection, 3: institution selection
  const [userInfo, setUserInfo] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const fetchOrganizations = async (token, user) => {
    try {
      setLoadingOrganizations(true);
      const response = await axios.get(getApiUrl('organizations'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedOrgs = response.data.data || [];
      setOrganizations(fetchedOrgs);
      
      if (fetchedOrgs.length === 0 && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const fetchInstitutions = async (token, orgDataStr) => {
    try {
      setLoadingInstitutions(true);
      const org = JSON.parse(orgDataStr);
      const response = await axios.get(getApiUrl(`organizations/${org._id}/institutions`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedInstitutions = response.data.data || [];
      setInstitutions(fetchedInstitutions);
    } catch (err) {
      setError('Failed to load campuses');
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(getApiUrl('auth/login'), formData);

      const user = response.data.data.user;
      const token = response.data.data.token;

      setUserInfo({ user, token });

      // Check if user is super admin
      if (user.role === 'super_admin') {
        // Move to organization selection step
        setStep(2);
        await fetchOrganizations(token, user);
        setLoading(false);
      } else {
        // For regular admin, auto-select their institution and organization, then proceed
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.institution) {
          localStorage.setItem('selectedInstitution', JSON.stringify(user.institution));
        }
        if (user.organization) {
          localStorage.setItem('selectedOrganization', JSON.stringify(user.organization));
        }

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleOrganizationSelect = async () => {
    if (!selectedOrganization) {
      setError('Please select an organization');
      return;
    }
    setStep(3);
    await fetchInstitutions(userInfo.token, selectedOrganization);
  };

  const handleInstitutionSelect = () => {
    if (!selectedInstitution) {
      setError('Please select a campus');
      return;
    }

    // Store authentication data with selected institution and organization
    localStorage.setItem('token', userInfo.token);
    localStorage.setItem('user', JSON.stringify(userInfo.user));
    localStorage.setItem('selectedOrganization', selectedOrganization);
    localStorage.setItem('selectedInstitution', selectedInstitution);

    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handleBackToCredentials = () => {
    setStep(1);
    setSelectedOrganization('');
    setSelectedInstitution('');
    setUserInfo(null);
    setOrganizations([]);
    setInstitutions([]);
    setError('');
  };

  const handleBackToOrganizations = () => {
    setStep(2);
    setSelectedInstitution('');
    setInstitutions([]);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          {/* Logo and Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 2,
              }}
            >
              {step === 1 ? <School sx={{ fontSize: 48, color: 'white' }} /> : <Business sx={{ fontSize: 48, color: 'white' }} />}
            </Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              SGC Education
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {step === 1 ? 'Super Admin Portal' : step === 2 ? 'Select Organization' : 'Select Campus'}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Login Form */}
          {step === 1 && (
            <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
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
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          )}

          {/* Step 2: Organization Selection */}
          {step === 2 && (
            <Box>
              {loadingOrganizations ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : organizations.length === 0 ? (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No organizations found. You can create your first organization from the dashboard.
                  </Alert>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                      localStorage.setItem('token', userInfo.token);
                      localStorage.setItem('user', JSON.stringify(userInfo.user));
                      window.location.href = '/dashboard';
                    }}
                    sx={{
                      mt: 3, mb: 2, py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Continue to Dashboard
                  </Button>

                  <Button fullWidth variant="outlined" onClick={handleBackToCredentials} sx={{ mb: 2 }}>
                    Back to Login
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Welcome, {userInfo?.user?.name}! Please select an organization.
                  </Alert>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Select Organization</InputLabel>
                    <Select
                      value={selectedOrganization}
                      onChange={(e) => setSelectedOrganization(e.target.value)}
                      label="Select Organization"
                      startAdornment={<InputAdornment position="start"><Business color="action" /></InputAdornment>}
                    >
                      {organizations.map((org) => (
                        <MenuItem key={org._id} value={JSON.stringify(org)}>
                          <Box>
                            <Typography variant="body1">{org.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {org.code} • {org.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleOrganizationSelect}
                    disabled={!selectedOrganization}
                    sx={{
                      mt: 3, mb: 2, py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Next Step
                  </Button>

                  <Button fullWidth variant="outlined" onClick={handleBackToCredentials} sx={{ mb: 2 }}>
                    Back to Login
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Step 3: Institution/Campus Selection */}
          {step === 3 && (
            <Box>
              {loadingInstitutions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : institutions.length === 0 ? (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No campuses found for this organization.
                  </Alert>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                      localStorage.setItem('token', userInfo.token);
                      localStorage.setItem('user', JSON.stringify(userInfo.user));
                      localStorage.setItem('selectedOrganization', selectedOrganization);
                      window.location.href = '/dashboard';
                    }}
                    sx={{
                      mt: 3, mb: 2, py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Continue to Dashboard
                  </Button>

                  <Button fullWidth variant="outlined" onClick={handleBackToOrganizations} sx={{ mb: 2 }}>
                    Back to Organizations
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Organization selected. Now, select a specific campus.
                  </Alert>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Select Campus</InputLabel>
                    <Select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      label="Select Campus"
                      startAdornment={<InputAdornment position="start"><School color="action" /></InputAdornment>}
                    >
                      {institutions.map((institution) => (
                        <MenuItem key={institution._id} value={JSON.stringify(institution)}>
                          <Box>
                            <Typography variant="body1">{institution.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {institution.code} • {institution.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleInstitutionSelect}
                    disabled={!selectedInstitution}
                    sx={{
                      mt: 3, mb: 2, py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Enter Dashboard
                  </Button>

                  <Button fullWidth variant="outlined" onClick={handleBackToOrganizations} sx={{ mb: 2 }}>
                    Back to Organizations
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              © 2024 SGC Education. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
