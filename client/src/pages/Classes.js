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
  Checkbox,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  Class as ClassIcon,
  Close,
  School,
  Group,
  TrendingUp,
  FilterList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feeHeadDialog, setFeeHeadDialog] = useState({ open: false, class: null });
  const [feeHeadSettings, setFeeHeadSettings] = useState({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fee heads list
  const feeHeads = [
    'Tuition Fee',
    'Arrears',
    'Examination Fee',
    'Transport Fee',
    'Annual Fee',
    'Heating Charges'
  ];

  // Months list
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch classes
      const classResponse = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching classes data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch classes';
      setError(errorMessage);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/classes/${classId}/toggle-status`,
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

  const handleOpenFeeHeadDialog = (classItem) => {
    // Load saved settings from localStorage or initialize with all checked
    const savedSettings = localStorage.getItem(`feeHeadSettings_${classItem._id}`);
    let initialSettings = {};

    if (savedSettings) {
      initialSettings = JSON.parse(savedSettings);
    } else {
      // Initialize all fee heads with all months checked
      feeHeads.forEach(feeHead => {
        initialSettings[feeHead] = {};
        months.forEach(month => {
          initialSettings[feeHead][month] = true;
        });
      });
    }

    setFeeHeadSettings(initialSettings);
    setFeeHeadDialog({ open: true, class: classItem });
  };

  const handleToggleFeeHeadMonth = (feeHead, month) => {
    setFeeHeadSettings(prev => ({
      ...prev,
      [feeHead]: {
        ...prev[feeHead],
        [month]: !prev[feeHead]?.[month]
      }
    }));
  };

  const handleSaveFeeHeadSettings = () => {
    if (feeHeadDialog.class) {
      // Save to localStorage
      localStorage.setItem(
        `feeHeadSettings_${feeHeadDialog.class._id}`,
        JSON.stringify(feeHeadSettings)
      );
      // Close dialog
      setFeeHeadDialog({ open: false, class: null });
      // Show success message
      setError('');
      // You could also show a success message here
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && classes.length === 0 && !error) {
    return (
      <Box>
        <TopBar title="Classes Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Classes Management" />
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
                      Total Classes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#667eea', mt: 1 }}>
                      {classes.length}
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
                    <School sx={{ fontSize: 32, color: '#667eea' }} />
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
                      Active Classes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f093fb', mt: 1 }}>
                      {classes.filter(c => c.isActive !== false).length}
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
                      Inactive Classes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4facfe', mt: 1 }}>
                      {classes.filter(c => c.isActive === false).length}
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
                    <Group sx={{ fontSize: 32, color: '#4facfe' }} />
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
                      {filteredClasses.length}
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
                    Classes Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage and organize academic classes
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/classes/new')}
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
              Add New Class
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
              placeholder="Search classes by name or code..."
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
                    Name
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Code
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Fee Type
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Group Name
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Created By
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Action
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    Fee Head Setting
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={6}>
                        <ClassIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          No classes found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first class'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls, index) => (
                    <TableRow
                      key={cls._id}
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
                            <ClassIcon sx={{ fontSize: 20, color: '#667eea' }} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {capitalizeFirstOnly(cls.name || 'N/A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cls.code || 'N/A'}
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
                          {capitalizeFirstOnly(cls.feeType?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {capitalizeFirstOnly(cls.group?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {capitalizeFirstOnly(cls.createdBy?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/classes/edit/${cls._id}`)}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#667eea',
                            color: '#667eea',
                            '&:hover': {
                              borderColor: '#5568d3',
                              bgcolor: '#667eea10',
                            },
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleOpenFeeHeadDialog(cls)}
                          sx={{
                            bgcolor: '#dc3545',
                            '&:hover': {
                              bgcolor: '#c82333',
                            },
                            textTransform: 'none',
                            boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)',
                            },
                          }}
                        >
                          Fee Head Setting
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredClasses.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #e9ecef' }}>
              <Typography variant="body2" color="text.secondary">
                Showing <strong>{filteredClasses.length}</strong> of <strong>{classes.length}</strong> classes
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Monthly Fee Head Setting Dialog */}
      <Dialog
        open={feeHeadDialog.open}
        onClose={() => setFeeHeadDialog({ open: false, class: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: '#0d6efd',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {feeHeadDialog.class?.name?.toUpperCase() || ''}
          </Typography>
          <IconButton
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0d6efd' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                    Fee Head Name
                  </TableCell>
                  {months.map((month) => (
                    <TableCell
                      key={month}
                      align="center"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        borderRight: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {feeHeads.map((feeHead, index) => (
                  <TableRow
                    key={feeHead}
                    sx={{
                      '&:nth-of-type(odd)': {
                        bgcolor: '#f8f9fa',
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, borderRight: '1px solid rgba(0,0,0,0.1)' }}>
                      {feeHead}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell
                        key={month}
                        align="center"
                        sx={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}
                      >
                        <Checkbox
                          checked={feeHeadSettings[feeHead]?.[month] || false}
                          onChange={() => handleToggleFeeHeadMonth(feeHead, month)}
                          color="primary"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            variant="outlined"
            sx={{
              color: '#6c757d',
              borderColor: '#6c757d',
              '&:hover': {
                borderColor: '#5c636a',
                bgcolor: 'rgba(108, 117, 125, 0.1)',
              },
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleSaveFeeHeadSettings}
            variant="contained"
            sx={{
              bgcolor: '#0d6efd',
              '&:hover': {
                bgcolor: '#0b5ed7',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Classes;

