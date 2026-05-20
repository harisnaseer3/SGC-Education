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
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
  Business, 
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const OrganizationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'mixed',
    description: ''
  });

  // Check if user is super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (isEditMode) {
      fetchOrganization();
    }
  }, [id]);

  const fetchOrganization = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`organizations/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = response.data.data;
      setFormData({
        name: data.name || '',
        code: data.code || '',
        type: data.type || 'mixed',
        description: data.description || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch organization');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      if (isEditMode) {
        await axios.put(
          getApiUrl(`organizations/${id}`),
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Organization updated successfully!');
      } else {
        await axios.post(
          getApiUrl('organizations'),
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Organization created successfully!');
      }

      setTimeout(() => {
        navigate('/organizations');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save organization');
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      
      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/organizations')}
            sx={{ mb: 2 }}
          >
            Back to Organizations
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Business sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                {isEditMode ? 'Edit Organization' : 'Create New Organization'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode ? 'Update organization details' : 'Fill in the information below to create a new overarching organization'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Card elevation={0} sx={{ mb: 3, borderRadius: 4, border: '1px solid #edf2f7' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#667eea15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Business sx={{ color: '#667eea', fontSize: 24 }} />
                </Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#667eea' }}>
                  Basic Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Organization Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Organization Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                    helperText="Unique identifier for the organization"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      label="Type"
                    >
                      <MenuItem value="school_level">School Level</MenuItem>
                      <MenuItem value="college_level">College Level</MenuItem>
                      <MenuItem value="university_level">University Level</MenuItem>
                      <MenuItem value="mixed">Mixed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    rows={4}
                    placeholder="Provide a brief description of this organization..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/organizations')}
              sx={{ px: 4 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
              sx={{
                px: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? 'Saving...' : 'Save Organization'}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default OrganizationForm;
