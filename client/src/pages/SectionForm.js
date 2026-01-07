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
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Save, ArrowBack, Class as ClassIcon, School } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const sessionsDefault = ['2025-2026', '2024-2025', '2023-2024'];

const SectionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState([]);
  const [sessions] = useState(sessionsDefault);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    session: '',
    class: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    strength: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isActive: true,
    institution: getUserInstitutionId(),
    department: '',
  });

  useEffect(() => {
    fetchClasses();
    if (isEditMode) {
      fetchSection();
    }
  }, [id]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSection = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/sections/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const section = response.data.data;
      setFormData({
        name: section.name,
        code: section.code,
        session: section.session || '',
        institution: section.institution?._id || user.institution || '',
        department: section.department?._id || '',
        class: section.class?._id || '',
        academicYear: section.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        strength: section.capacity || '',
        startDate: section.startDate ? new Date(section.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: section.endDate ? new Date(section.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isActive: section.isActive !== undefined ? section.isActive : true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch section');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'class') {
      const cls = classes.find((c) => c._id === value);
      setFormData({
        ...formData,
        class: value,
        institution: cls?.institution?._id || formData.institution,
        department: cls?.department?._id || formData.department,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        capacity: formData.strength || 0,
      };

      // Remove empty department field to prevent validation errors
      if (!payload.department) {
        delete payload.department;
      }

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/sections/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/sections',
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section created successfully!');
      }

      setTimeout(() => {
        navigate('/sections');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Section' : 'Add New Section'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Section' : 'Add New Section'} />
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
                onClick={() => navigate('/sections')}
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
                Back to Sections
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
                  {isEditMode ? 'Edit Section Information' : 'Create New Section'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {isEditMode
                    ? 'Update section details and settings'
                    : 'Fill in the information below to create a new class section'}
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
                    Section Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Box component="form" onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Section Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., Section A, Morning Section"
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
                        label="Section Code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="e.g., SEC-A, MORN"
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
                        <InputLabel>Session</InputLabel>
                        <Select
                          name="session"
                          value={formData.session}
                          onChange={handleChange}
                          label="Session"
                        >
                          <MenuItem value="">Select Session</MenuItem>
                          {sessions.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
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
                        <InputLabel>Class</InputLabel>
                        <Select
                          name="class"
                          value={formData.class}
                          onChange={handleChange}
                          label="Class"
                        >
                          <MenuItem value="">Select School Class</MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls._id} value={cls._id}>
                              {capitalizeFirstOnly(cls.name || '')}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Strength"
                        name="strength"
                        type="number"
                        value={formData.strength}
                        onChange={handleChange}
                        placeholder="Maximum capacity"
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
                        label="Academic Year"
                        name="academicYear"
                        value={formData.academicYear}
                        onChange={handleChange}
                        placeholder="2025-2026"
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
                        label="Start Date"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
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
                        label="End Date"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
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
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            sx={{
                              color: '#667eea',
                              '&.Mui-checked': {
                                color: '#667eea',
                              },
                            }}
                          />
                        }
                        label="Is Active"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                        <Button
                          variant="outlined"
                          onClick={() => navigate('/sections')}
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
                          {loading ? 'Saving...' : isEditMode ? 'Update Section' : 'Create Section'}
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

export default SectionForm;
