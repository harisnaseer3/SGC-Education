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
import { Save, ArrowBack, Class as ClassIcon, School } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const ClassForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    institution: getUserInstitutionId(),
    department: '',
    group: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  });

  const location = useLocation();

  // Initialise institution/department from user or URL (e.g. ?department=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const depFromQuery = params.get('department');
    setFormData((prev) => ({
      ...prev,
      institution: prev.institution || user.institution || '',
      department: depFromQuery || prev.department
    }));
  }, [location.search]);

  useEffect(() => {
    fetchGroups();
    if (!isEditMode) {
      // For new class, ensure we have a department if provided via query
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');
      if (depFromQuery) {
        setFormData((prev) => ({ ...prev, department: depFromQuery }));
      }
    } else {
      fetchClass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.search]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = formData.institution
        ? `http://localhost:5000/api/v1/groups?institution=${formData.institution}`
        : 'http://localhost:5000/api/v1/groups';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  };

  const fetchClass = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/classes/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const cls = response.data.data;
      setFormData({
        name: cls.name,
        code: cls.code,
        institution: cls.institution?._id || user.institution || '',
        department: cls.department?._id || '',
        group: cls.group?._id || '',
        academicYear: cls.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch class');
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
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');

      // Get institution from multiple sources and extract _id if it's an object
      let institutionId = formData.institution || currentUser.institution || selectedInstitutionStr;
      
      // Handle selectedInstitution from localStorage (might be stringified JSON)
      if (selectedInstitutionStr && typeof selectedInstitutionStr === 'string') {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          if (parsed && parsed._id) {
            institutionId = parsed._id;
          } else if (parsed && typeof parsed === 'string') {
            institutionId = parsed;
          }
        } catch (e) {
          // If it's not JSON, it might be a plain string ID
          institutionId = selectedInstitutionStr;
        }
      }
      
      // If institution is an object, extract the _id
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id || institutionId;
      }
      
      // Ensure we have a string ID, not an object
      if (institutionId && typeof institutionId !== 'string') {
        institutionId = String(institutionId);
      }

      if (!institutionId) {
        setError('Institution not found. Please select an institution or contact administrator.');
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        group: formData.group,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        institution: institutionId,
        // department is optional; include if present (from form or query)
        ...(formData.department || depFromQuery
          ? { department: formData.department || depFromQuery }
          : {})
      };

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/classes/${id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/classes',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class created successfully!');
      }

      setTimeout(() => {
        navigate('/classes');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save class');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Class' : 'Add New Class'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Class' : 'Add New Class'} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 0,
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            background: 'white',
            overflow: 'hidden',
          }}
        >
          {/* Header Section with Gradient */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              p: 4,
              color: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/classes')}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
                variant="outlined"
              >
                Back to Classes
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderRadius: 3,
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClassIcon sx={{ fontSize: 48 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {isEditMode ? 'Edit Class Information' : 'Create New Class'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {isEditMode
                    ? 'Update class details and settings'
                    : 'Fill in the information below to create a new academic class'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Content Section */}
          <Box sx={{ p: 4 }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: 28,
                  },
                }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: 28,
                  },
                }}
              >
                {success}
              </Alert>
            )}

            {/* Form Card */}
            <Card
              elevation={0}
              sx={{
                border: '1px solid #e9ecef',
                borderRadius: 2,
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <School sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
                    Class Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Class Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., First Year, Grade 1"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#667eea',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Class Code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="e.g., FY, G1"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#667eea',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl
                        fullWidth
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover fieldset': {
                              borderColor: '#667eea',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea',
                              borderWidth: 2,
                            },
                          },
                        }}
                      >
                        <InputLabel>Group</InputLabel>
                        <Select
                          name="group"
                          value={formData.group}
                          onChange={handleChange}
                          label="Group"
                        >
                          <MenuItem value="">Select Group</MenuItem>
                          {groups.map((group) => (
                            <MenuItem key={group._id} value={group._id}>
                              {group.name} ({group.code})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                        <Button
                          variant="outlined"
                          onClick={() => navigate('/classes')}
                          sx={{
                            minWidth: 120,
                            px: 3,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                            borderColor: '#6c757d',
                            color: '#6c757d',
                            '&:hover': {
                              borderColor: '#5c636a',
                              bgcolor: 'rgba(108, 117, 125, 0.1)',
                            },
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                          disabled={loading}
                          sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            minWidth: 120,
                            px: 3,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                              transform: 'translateY(-2px)',
                            },
                            transition: 'all 0.3s ease',
                            '&:disabled': {
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              opacity: 0.6,
                            },
                          }}
                        >
                          {loading ? 'Saving...' : isEditMode ? 'Update Class' : 'Create Class'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Container>

    </Box>
  );
};

export default ClassForm;

