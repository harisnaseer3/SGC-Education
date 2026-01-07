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
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  Group as GroupIcon,
  School,
  TrendingUp,
  FilterList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectDialog, setSubjectDialog] = useState({ open: false, group: null, selected: [] });
  const [subjectAssignments, setSubjectAssignments] = useState({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const subjectOptions = [
    'Arts',
    'Value Education',
    'Physical Education',
    'Computer',
    'Geography',
    'Mathematics',
    'Science',
    'English',
    'Social Studies'
  ];

  // Load saved subject assignments on mount
  useEffect(() => {
    const storedAssignments = localStorage.getItem('groupSubjectAssignments');
    if (storedAssignments) {
      try {
        setSubjectAssignments(JSON.parse(storedAssignments));
      } catch (e) {
        console.error('Failed to parse group subject assignments', e);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch groups (only search filter)
      let url = 'http://localhost:5000/api/v1/groups';
      const params = [];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const groupResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGroups(groupResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching groups data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch groups';
      setError(errorMessage);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups;

  if (loading && groups.length === 0 && !error) {
    return (
      <Box>
        <TopBar title="Groups Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Groups Management" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
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
                      Total Groups
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#667eea', mt: 1 }}>
                      {groups.length}
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
                    <GroupIcon sx={{ fontSize: 32, color: '#667eea' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
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
                      Filtered Results
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f093fb', mt: 1 }}>
                      {filteredGroups.length}
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
                    <FilterList sx={{ fontSize: 32, color: '#f093fb' }} />
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
                  <GroupIcon sx={{ fontSize: 32, color: '#667eea' }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a1a1a' }}>
                    Groups Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage and organize student groups
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/groups/new')}
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
              Add New Group
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
              placeholder="Search groups by name or code..."
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
                    Group Id
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
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Box py={6}>
                        <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          No groups found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first group'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((group, idx) => (
                    <TableRow
                      key={group._id}
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
                        <Chip
                          label={idx + 1}
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
                            <GroupIcon sx={{ fontSize: 20, color: '#667eea' }} />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {group.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {group.createdBy?.name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/groups/edit/${group._id}`)}
                            title="Edit"
                            sx={{
                              '&:hover': {
                                bgcolor: '#667eea10',
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSubjectDialog({
                              open: true,
                              group,
                              selected: subjectAssignments[group._id] || []
                            })}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              borderColor: '#667eea',
                              color: '#667eea',
                              '&:hover': {
                                borderColor: '#5568d3',
                                bgcolor: '#667eea10',
                              },
                            }}
                          >
                            Assign Subjects
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredGroups.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #e9ecef' }}>
              <Typography variant="body2" color="text.secondary">
                Showing <strong>{filteredGroups.length}</strong> of <strong>{groups.length}</strong> groups
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Assign Subjects Dialog (local-only for now) */}
      <Dialog
        open={subjectDialog.open}
        onClose={() => setSubjectDialog({ open: false, group: null, selected: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Group Subjects</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Subjects
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={
                  subjectDialog.selected.length === subjectOptions.length &&
                  subjectOptions.length > 0
                }
                indeterminate={
                  subjectDialog.selected.length > 0 &&
                  subjectDialog.selected.length < subjectOptions.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSubjectDialog((prev) => ({ ...prev, selected: subjectOptions }));
                  } else {
                    setSubjectDialog((prev) => ({ ...prev, selected: [] }));
                  }
                }}
              />
            }
            label="Select All"
            sx={{ mb: 1 }}
          />
          {subjectOptions.map((subject) => (
            <FormControlLabel
              key={subject}
              control={
                <Checkbox
                  checked={subjectDialog.selected.includes(subject)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSubjectDialog((prev) => ({
                      ...prev,
                      selected: checked
                        ? [...prev.selected, subject]
                        : prev.selected.filter((s) => s !== subject)
                    }));
                  }}
                />
              }
              label={subject}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubjectDialog({ open: false, group: null, selected: [] })}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (subjectDialog.group) {
                const updated = {
                  ...subjectAssignments,
                  [subjectDialog.group._id]: subjectDialog.selected
                };
                setSubjectAssignments(updated);
                localStorage.setItem('groupSubjectAssignments', JSON.stringify(updated));
              }
              setSubjectDialog({ open: false, group: null, selected: [] });
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;

