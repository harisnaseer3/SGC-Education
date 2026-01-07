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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  MoreVert,
  Block,
  Checklist,
  Visibility,
  Person,
  Event,
  AccessTime,
  FormatListNumbered,
  RestartAlt,
  Delete,
  Close,
  Class as ClassIcon,
  School,
  TrendingUp,
  FilterList,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const Sections = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [inchargeDialogOpen, setInchargeDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [rollNumberDialogOpen, setRollNumberDialogOpen] = useState(false);
  const [resetConfirmDialogOpen, setResetConfirmDialogOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [inchargeList, setInchargeList] = useState([]);
  const [leaveList, setLeaveList] = useState([]);
  const [inchargeFormData, setInchargeFormData] = useState({
    teacher: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [leaveFormData, setLeaveFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [rollNumberFormData, setRollNumberFormData] = useState({
    prefix: '',
    postfix: '',
    startFrom: '',
    enableSetting: false,
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Initialize institution on mount
  useEffect(() => {
    if (!selectedInstitution) {
      const institutionData = localStorage.getItem('selectedInstitution');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          setSelectedInstitution(institution._id || institution);
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      } else if (!isSuperAdmin && user.institution) {
        setSelectedInstitution(user.institution);
      }
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    if (!isSuperAdmin && !selectedInstitution) {
      if (user.institution) {
        return;
      } else {
        setError('Your account is not assigned to an institution. Please contact administrator.');
        setLoading(false);
        return;
      }
    }

    if (isSuperAdmin || selectedInstitution) {
      fetchData();
    }
  }, [selectedInstitution]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch sections
      let url = 'http://localhost:5000/api/v1/sections';
      if (selectedInstitution) {
        url += `?institution=${selectedInstitution}`;
      }

      const sectionResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sectionsData = sectionResponse.data.data || [];
      console.log('Sections data:', sectionsData);
      console.log('Sample section class data:', sectionsData[0]?.class);
      setSections(sectionsData);
    } catch (err) {
      console.error('Error fetching sections data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch sections';
      setError(errorMessage);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/sections/${sectionId}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleMenuOpen = (event, section) => {
    setAnchorEl(event.currentTarget);
    setSelectedSection(section);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSection(null);
  };

  const handleEdit = () => {
    if (selectedSection) {
      navigate(`/sections/edit/${selectedSection._id}`);
    }
    handleMenuClose();
  };

  const handleDeactivate = async () => {
    if (selectedSection) {
      await handleToggleStatus(selectedSection._id);
    }
    handleMenuClose();
  };

  const handleGetSubjectPlan = () => {
    // TODO: Implement Get Subject Plan functionality
    alert('Get Subject Plan - Coming Soon');
    handleMenuClose();
  };

  const handleViewSubjectPlan = () => {
    // TODO: Implement View Subject Plan functionality
    alert('View Subject Plan - Coming Soon');
    handleMenuClose();
  };

  const handleManageSectionIncharge = async () => {
    if (selectedSection) {
      await fetchTeachers();
      await fetchSectionIncharge(selectedSection._id);
      setInchargeDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/users?role=teacher', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.data || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setTeachers([]);
    }
  };

  const fetchSectionIncharge = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/sections/${sectionId}/incharge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInchargeList(response.data.data || []);
    } catch (err) {
      console.error('Error fetching section incharge:', err);
      setInchargeList([]);
    }
  };

  const handleInchargeFormChange = (e) => {
    const { name, value } = e.target;
    setInchargeFormData({
      ...inchargeFormData,
      [name]: value
    });
  };

  const handleSaveIncharge = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/incharge`,
        inchargeFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the incharge list
      await fetchSectionIncharge(selectedSection._id);
      
      // Reset form
      setInchargeFormData({
        teacher: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      
      alert('Section incharge assigned successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign section incharge');
    }
  };

  const handleDeleteIncharge = async (inchargeId) => {
    if (!window.confirm('Are you sure you want to remove this incharge assignment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/incharge/${inchargeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the incharge list
      await fetchSectionIncharge(selectedSection._id);
      
      alert('Section incharge removed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove section incharge');
    }
  };

  const handleCloseInchargeDialog = () => {
    setInchargeDialogOpen(false);
    setInchargeFormData({
      teacher: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleManageSectionLeave = async () => {
    if (selectedSection) {
      await fetchSectionLeave(selectedSection._id);
      setLeaveDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchSectionLeave = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/sections/${sectionId}/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaveList(response.data.data || []);
    } catch (err) {
      console.error('Error fetching section leave:', err);
      setLeaveList([]);
    }
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData({
      ...leaveFormData,
      [name]: value
    });
  };

  const handleSaveLeave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/leave`,
        leaveFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the leave list
      await fetchSectionLeave(selectedSection._id);
      
      // Reset form
      setLeaveFormData({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      
      alert('Section leave added successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add section leave');
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to remove this leave record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/leave/${leaveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the leave list
      await fetchSectionLeave(selectedSection._id);
      
      alert('Section leave removed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove section leave');
    }
  };

  const handleCloseLeaveDialog = () => {
    setLeaveDialogOpen(false);
    setLeaveFormData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleViewSectionTime = () => {
    // TODO: Implement View Section Time functionality
    alert('View Section Time - Coming Soon');
    handleMenuClose();
  };

  const handleManageRollNumberSet = async () => {
    if (selectedSection) {
      await fetchRollNumberSetting(selectedSection._id);
      setRollNumberDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchRollNumberSetting = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/sections/${sectionId}/roll-number-setting`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.data) {
        setRollNumberFormData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching roll number setting:', err);
      // If no setting exists, keep default values
    }
  };

  const handleRollNumberFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRollNumberFormData({
      ...rollNumberFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleUpdateRollNumberSetting = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/roll-number-setting`,
        rollNumberFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Roll number setting updated successfully!');
      setRollNumberDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update roll number setting');
    }
  };

  const handleCloseRollNumberDialog = () => {
    setRollNumberDialogOpen(false);
    setRollNumberFormData({
      prefix: '',
      postfix: '',
      startFrom: '',
      enableSetting: false,
    });
  };

  const handleResetRollNumberSetting = () => {
    setResetConfirmDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmReset = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/v1/sections/${selectedSection._id}/reset-roll-number`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResetConfirmDialogOpen(false);
      alert('Roll number setting reset successfully!');
      fetchData(); // Refresh the sections list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset roll number setting');
      setResetConfirmDialogOpen(false);
    }
  };

  const handleCancelReset = () => {
    setResetConfirmDialogOpen(false);
  };

  const filteredSections = sections.filter((section) =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && sections.length === 0 && !error) {
    return (
      <Box>
        <TopBar title="Sections Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Sections Management" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)',
                border: '1px solid #667eea30',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Total Sections
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#667eea', mt: 1 }}>
                      {sections.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: '#667eea20',
                      borderRadius: '50%',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ClassIcon sx={{ fontSize: 32, color: '#667eea' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c05 100%)',
                border: '1px solid #f093fb30',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(240, 147, 251, 0.15)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Active Sections
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f093fb', mt: 1 }}>
                      {sections.filter(s => s.isActive !== false).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: '#f093fb20',
                      borderRadius: '50%',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 32, color: '#f093fb' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #4facfe15 0%, #00f2fe05 100%)',
                border: '1px solid #4facfe30',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(79, 172, 254, 0.15)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Inactive Sections
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4facfe', mt: 1 }}>
                      {sections.filter(s => s.isActive === false).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: '#4facfe20',
                      borderRadius: '50%',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GroupIcon sx={{ fontSize: 32, color: '#4facfe' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={0}
              sx={{
                background: 'linear-gradient(135deg, #43e97b15 0%, #38f9d705 100%)',
                border: '1px solid #43e97b30',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(67, 233, 123, 0.15)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Filtered Results
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#43e97b', mt: 1 }}>
                      {filteredSections.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: '#43e97b20',
                      borderRadius: '50%',
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FilterList sx={{ fontSize: 32, color: '#43e97b' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            background: 'white',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
              pb: 3,
              borderBottom: '2px solid #f0f0f0',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box
                  sx={{
                    bgcolor: '#667eea15',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClassIcon sx={{ fontSize: 32, color: '#667eea' }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
                    Sections Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage and organize class sections
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/sections/new')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              }}
            >
              Add New Section
            </Button>
          </Box>

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

          {/* Warning Message */}
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: 28,
              },
            }}
          >
            * The Sections that are InActive, there attendance would not be loaded.
          </Alert>

          {/* Search Bar */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: '#f8f9fa',
              borderRadius: 2,
              border: '1px solid #e9ecef',
            }}
          >
            <TextField
              fullWidth
              placeholder="Search sections by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
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
          </Box>

          {/* Table */}
          <TableContainer
            sx={{
              borderRadius: 2,
              border: '1px solid #e9ecef',
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#667eea' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Class
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Section
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Session
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Strength
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Created By
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Status
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={6}>
                        <ClassIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          No sections found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first section'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSections.map((section) => (
                    <TableRow
                      key={section._id}
                      hover
                      sx={{
                        '&:nth-of-type(even)': {
                          bgcolor: '#f8f9fa',
                        },
                        '&:hover': {
                          bgcolor: '#f0f4ff',
                        },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              bgcolor: '#667eea15',
                              borderRadius: 1,
                              p: 0.75,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <School sx={{ fontSize: 20, color: '#667eea' }} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {capitalizeFirstOnly(section.class?.name || 'N/A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {capitalizeFirstOnly(section.name || section.code || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={section.academicYear || 'N/A'}
                          size="small"
                          sx={{
                            bgcolor: '#667eea15',
                            color: '#667eea',
                            fontWeight: 600,
                            border: '1px solid #667eea30',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {section.capacity || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {capitalizeFirstOnly(section.createdBy?.name || 'admin')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={section.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={section.isActive ? 'success' : 'default'}
                          sx={{
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => handleMenuOpen(e, section)}
                          sx={{
                            '&:hover': {
                              bgcolor: '#667eea10',
                            },
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredSections.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #e9ecef' }}>
              <Typography variant="body2" color="text.secondary">
                Showing <strong>{filteredSections.length}</strong> of <strong>{sections.length}</strong> sections
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { minWidth: 250 }
          }}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleDeactivate}>
            <ListItemIcon>
              <Block fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>
              {selectedSection?.isActive ? 'Deactivate' : 'Activate'}
            </ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleGetSubjectPlan}>
            <ListItemIcon>
              <Checklist fontSize="small" />
            </ListItemIcon>
            <ListItemText>Get Subject Plan</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleViewSubjectPlan}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Subject Plan</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageSectionIncharge}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Section Incharge</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageSectionLeave}>
            <ListItemIcon>
              <Event fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Section Leave</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleViewSectionTime}>
            <ListItemIcon>
              <AccessTime fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Section Time</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageRollNumberSet}>
            <ListItemIcon>
              <FormatListNumbered fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Roll Number Setting</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleResetRollNumberSetting}>
            <ListItemIcon>
              <RestartAlt fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reset Roll Number Setting</ListItemText>
          </MenuItem>
        </Menu>

        {/* Section Incharge Dialog */}
        <Dialog 
          open={inchargeDialogOpen} 
          onClose={handleCloseInchargeDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              SECTION INCHARGE
            </Typography>
            <IconButton onClick={handleCloseInchargeDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Teachers</InputLabel>
                    <Select
                      name="teacher"
                      value={inchargeFormData.teacher}
                      onChange={handleInchargeFormChange}
                      label="Teachers"
                    >
                      <MenuItem value="">Select Teacher</MenuItem>
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={inchargeFormData.startDate}
                  onChange={handleInchargeFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={inchargeFormData.endDate}
                  onChange={handleInchargeFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              </Grid>
            </Box>

            {/* Incharge List Table */}
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#1976d2' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Teacher</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inchargeList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No incharge assignments found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inchargeList.map((incharge) => (
                      <TableRow key={incharge._id}>
                        <TableCell>{selectedSection?.code}</TableCell>
                        <TableCell>{incharge.teacher?.name || 'N/A'}</TableCell>
                        <TableCell>{new Date(incharge.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(incharge.endDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteIncharge(incharge._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseInchargeDialog} 
              variant="outlined"
              color="inherit"
            >
              Close
            </Button>
            <Button 
              onClick={handleSaveIncharge} 
              variant="contained"
              color="primary"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Section Leave Dialog */}
        <Dialog 
          open={leaveDialogOpen} 
          onClose={handleCloseLeaveDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              SECTION LEAVE
            </Typography>
            <IconButton onClick={handleCloseLeaveDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={leaveFormData.startDate}
                    onChange={handleLeaveFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={leaveFormData.endDate}
                  onChange={handleLeaveFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              </Grid>
            </Box>

            {/* Leave List Table */}
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#1976d2' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No leave records found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveList.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>{selectedSection?.code}</TableCell>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLeave(leave._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseLeaveDialog} 
              variant="outlined"
              color="inherit"
            >
              Close
            </Button>
            <Button 
              onClick={handleSaveLeave} 
              variant="contained"
              color="primary"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Roll Number Setting Dialog */}
        <Dialog 
          open={rollNumberDialogOpen} 
          onClose={handleCloseRollNumberDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              ROLL NUMBER SETTING
            </Typography>
            <IconButton onClick={handleCloseRollNumberDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Prefix"
                    name="prefix"
                    placeholder="Prefix"
                    value={rollNumberFormData.prefix}
                    onChange={handleRollNumberFormChange}
                  />
                </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Postfix"
                  name="postfix"
                  placeholder="Postfix"
                  value={rollNumberFormData.postfix}
                  onChange={handleRollNumberFormChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Start From"
                  name="startFrom"
                  type="number"
                  value={rollNumberFormData.startFrom}
                  onChange={handleRollNumberFormChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="enableSetting"
                      checked={rollNumberFormData.enableSetting}
                      onChange={handleRollNumberFormChange}
                    />
                  }
                  label="Enable Setting"
                />
              </Grid>
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseRollNumberDialog} 
              variant="outlined"
              color="inherit"
            >
              Close
            </Button>
            <Button 
              onClick={handleUpdateRollNumberSetting} 
              variant="contained"
              color="primary"
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Roll Number Confirmation Dialog */}
        <Dialog
          open={resetConfirmDialogOpen}
          onClose={handleCancelReset}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: '#f44336', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              ⚠️ Warning
            </Typography>
            <IconButton onClick={handleCancelReset} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Warning:</strong> Old Numbers Would be Deleted.
              </Typography>
              <Typography variant="body1">
                Are you sure you want to Reset Section Roll Number Setting According to Prefix and Postfix?
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCancelReset} 
              variant="outlined"
              color="inherit"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmReset} 
              variant="contained"
              color="error"
            >
              Yes, Reset
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Sections;

