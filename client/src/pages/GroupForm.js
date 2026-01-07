import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Save, ArrowBack, Group as GroupIcon, School } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    type: 'Study',
    institution: getUserInstitutionId(),
    department: '',
    class: '',
    section: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    description: '',
    capacity: 10,
    leader: {
      userId: '',
      name: '',
      email: ''
    },
    supervisor: {
      userId: '',
      name: '',
      email: ''
    },
    members: []
  });

  useEffect(() => {
    // try to set institution from selectedInstitution if missing
    if (!formData.institution) {
      const stored = localStorage.getItem('selectedInstitution');
      if (stored) {
        try {
          const inst = JSON.parse(stored);
          setFormData((prev) => ({ ...prev, institution: inst._id || inst }));
        } catch (e) {
          console.error('Failed to parse institution', e);
        }
      }
    }
    fetchDepartments();
    if (isEditMode) {
      fetchGroup();
    }
  }, [id, formData.institution]);

  const fetchDepartments = async () => {
    if (!formData.institution) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/departments?institution=${formData.institution}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const depts = response.data.data || [];
      setDepartments(depts);
      if (!formData.department && depts.length > 0) {
        setFormData((prev) => ({ ...prev, department: depts[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const fetchGroup = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/groups/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const group = response.data.data;
      setFormData({
        name: group.name,
        code: group.code,
        type: group.type,
        institution: group.institution._id,
        department: group.department._id,
        class: group.class?._id || '',
        section: group.section?._id || '',
        academicYear: group.academicYear,
        description: group.description || '',
        capacity: group.capacity || 10,
        leader: {
          userId: group.leader?.userId?._id || '',
          name: group.leader?.name || '',
          email: group.leader?.email || ''
        },
        supervisor: {
          userId: group.supervisor?.userId?._id || '',
          name: group.supervisor?.name || '',
          email: group.supervisor?.email || ''
        },
        members: group.members || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch group');
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

  const generateCode = (name) => {
    if (!name) return '';
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      // Build minimal payload and strip empty optional refs to avoid ObjectId cast errors
      const payload = {
        name: formData.name,
        code: formData.code || generateCode(formData.name),
        institution: formData.institution,
        department: formData.department,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        type: formData.type || 'Study',
        capacity: formData.capacity || 10,
      };

      if (formData.class) payload.class = formData.class;
      if (formData.section) payload.section = formData.section;
      if (formData.description) payload.description = formData.description;

      // Leader (optional)
      const leader = formData.leader || {};
      if (leader.userId || leader.name || leader.email) {
        const cleanLeader = { ...leader };
        if (!cleanLeader.userId) delete cleanLeader.userId;
        payload.leader = cleanLeader;
      }

      // Supervisor (optional)
      const supervisor = formData.supervisor || {};
      if (supervisor.userId || supervisor.name || supervisor.email) {
        const cleanSupervisor = { ...supervisor };
        if (!cleanSupervisor.userId) delete cleanSupervisor.userId;
        payload.supervisor = cleanSupervisor;
      }

      // Members (optional) - include only non-empty entries
      const cleanMembers = (formData.members || []).filter(
        (m) => m.userId || m.name || m.email
      ).map((m) => {
        const copy = { ...m };
        if (!copy.userId) delete copy.userId;
        return copy;
      });
      if (cleanMembers.length) {
        payload.members = cleanMembers;
      }

      if (!payload.institution) {
        setError('Institution not set. Please contact administrator.');
        setLoading(false);
        return;
      }

      if (!payload.department && departments.length > 0) {
        payload.department = departments[0]._id;
      }

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/groups/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/groups',
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group created successfully!');
      }

      setTimeout(() => {
        navigate('/groups');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Group' : 'Add New Group'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Group' : 'Add New Group'} />
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
                onClick={() => navigate('/groups')}
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
                Back to Groups
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
                <GroupIcon sx={{ fontSize: 48 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {isEditMode ? 'Edit Group Information' : 'Create New Group'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {isEditMode
                    ? 'Update group details and settings'
                    : 'Fill in the information below to create a new student group'}
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
                    Group Details
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    required
                    label="Group Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Science Group, Arts Group"
                    sx={{
                      mb: 3,
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

                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/groups')}
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
                      {loading ? 'Saving...' : isEditMode ? 'Update Group' : 'Create Group'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default GroupForm;

