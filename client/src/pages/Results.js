import React, { useState, useEffect } from 'react';
import {
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
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Visibility,
  Assessment,
  School,
  Person,
  CalendarToday,
  TrendingUp,
  Print,
  FileDownload,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { useTablePagination } from '../hooks/useTablePagination';
import { format } from 'date-fns';

const Results = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [resultDialog, setResultDialog] = useState({ open: false, result: null, mode: 'create' });
  const [viewDialog, setViewDialog] = useState({ open: false, result: null });
  const [stats, setStats] = useState({});
  const pagination = useTablePagination(10);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const examTypes = ['quiz', 'assignment', 'midterm', 'final', 'practical', 'project', 'oral', 'other'];
  const statuses = ['draft', 'published', 'archived'];
  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch classes when institution changes
  useEffect(() => {
    if (selectedInstitution) {
      fetchClasses();
    }
  }, [selectedInstitution]);

  // Fetch sections when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchSections();
    }
  }, [selectedClass]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (selectedInstitution) params.append('institution', selectedInstitution);
      if (selectedClass) params.append('class', selectedClass);
      if (selectedSection) params.append('section', selectedSection);
      if (selectedExamType) params.append('examType', selectedExamType);
      if (selectedAcademicYear) params.append('academicYear', selectedAcademicYear);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(getApiUrl(`results?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResults(response.data.data || []);
    } catch (err) {
      console.error('Error fetching results:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch results';
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = selectedInstitution ? `?institution=${selectedInstitution}` : '';
      const response = await axios.get(getApiUrl(`classes${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = selectedClass ? `?class=${selectedClass}` : '';
      const response = await axios.get(getApiUrl(`sections${params}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedInstitution) params.append('institution', selectedInstitution);
      if (selectedClass) params.append('class', selectedClass);
      if (selectedExamType) params.append('examType', selectedExamType);

      const response = await axios.get(getApiUrl(`results/stats/overview?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStats(response.data.data || {});
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleOpenDialog = (mode, result = null) => {
    setResultDialog({ open: true, result, mode });
  };

  const handleCloseDialog = () => {
    setResultDialog({ open: false, result: null, mode: 'create' });
  };

  const handleOpenViewDialog = (result) => {
    setViewDialog({ open: true, result });
  };

  const handleCloseViewDialog = () => {
    setViewDialog({ open: false, result: null });
  };

  const handleDelete = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(getApiUrl(`results/${resultId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Result deleted successfully');
      fetchData();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete result');
    }
  };

  const handlePublish = async (resultId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`results/${resultId}/publish`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Result published successfully');
      fetchData();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish result');
    }
  };

  const handleFilterChange = () => {
    fetchData();
    fetchStats();
  };

  useEffect(() => {
    handleFilterChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstitution, selectedClass, selectedSection, selectedExamType, selectedAcademicYear, selectedStatus]);

  const filteredResults = results.filter((result) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        result.examName?.toLowerCase().includes(searchLower) ||
        result.subject?.toLowerCase().includes(searchLower) ||
        result.student?.user?.name?.toLowerCase().includes(searchLower) ||
        result.student?.enrollmentNumber?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const paginatedResults = filteredResults.slice(
    pagination.page * pagination.rowsPerPage,
    pagination.page * pagination.rowsPerPage + pagination.rowsPerPage
  );

  const getGradeColor = (grade) => {
    const colorMap = {
      'A+': '#10b981',
      'A': '#34d399',
      'B+': '#60a5fa',
      'B': '#3b82f6',
      'C+': '#fbbf24',
      'C': '#f59e0b',
      'D+': '#fb923c',
      'D': '#f97316',
      'F': '#ef4444'
    };
    return colorMap[grade] || '#6b7280';
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'draft': 'default',
      'published': 'success',
      'archived': 'warning'
    };
    return colorMap[status] || 'default';
  };

  if (loading && results.length === 0 && !error) {
    return (
      <Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', overflowX: 'hidden' }}>
      <Box sx={{ mt: 3, mb: 3, flex: 1, px: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Paper sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                Results Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage student exam results and grades
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/results/new')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Add Result
            </Button>
          </Box>

          {/* Stats Cards */}
          {stats.total !== undefined && (
            <Grid container spacing={2} sx={{ mb: 3, width: '100%', maxWidth: '100%' }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Total Results
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {stats.total || 0}
                        </Typography>
                      </Box>
                      <Assessment sx={{ fontSize: 40, color: '#667eea' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Published
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {stats.published || 0}
                        </Typography>
                      </Box>
                      <TrendingUp sx={{ fontSize: 40, color: '#10b981' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Draft
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="warning.main">
                          {stats.draft || 0}
                        </Typography>
                      </Box>
                      <Edit sx={{ fontSize: 40, color: '#f59e0b' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Avg Percentage
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                          {stats.averagePercentage?.toFixed(1) || '0.0'}%
                        </Typography>
                      </Box>
                      <School sx={{ fontSize: 40, color: '#3b82f6' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Filters */}
          <Box sx={{ mb: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              {user.role === 'super_admin' && (
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Institution</InputLabel>
                    <Select
                      value={selectedInstitution}
                      label="Institution"
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {/* Institutions would be loaded here */}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={selectedClass}
                    label="Class"
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Exam Type</InputLabel>
                  <Select
                    value={selectedExamType}
                    label="Exam Type"
                    onChange={(e) => setSelectedExamType(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {examTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    label="Status"
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Results Table */}
          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#667eea' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Student</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Exam</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subject</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Marks</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Grade</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No results found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedResults.map((result) => (
                    <TableRow key={result._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {result.student?.user?.name || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {result.student?.enrollmentNumber || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {result.examName}
                          </Typography>
                          <Chip
                            label={result.examType}
                            size="small"
                            sx={{ mt: 0.5, textTransform: 'capitalize' }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{result.subject}</TableCell>
                      <TableCell>
                        {result.examDate ? format(new Date(result.examDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.marks?.obtained || 0} / {result.marks?.total || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.marks?.percentage?.toFixed(1) || 0}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.marks?.grade || 'N/A'}
                          size="small"
                          sx={{
                            bgcolor: getGradeColor(result.marks?.grade),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          size="small"
                          color={getStatusColor(result.status)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenViewDialog(result)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/results/edit/${result._id}`)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          {result.status !== 'published' && (
                            <IconButton
                              size="small"
                              onClick={() => handlePublish(result._id)}
                              color="success"
                            >
                              <TrendingUp />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(result._id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredResults.length}
            page={pagination.page}
            onPageChange={(e, newPage) => pagination.handleChangePage(e, newPage)}
            rowsPerPage={pagination.rowsPerPage}
            onRowsPerPageChange={(e) => pagination.handleChangeRowsPerPage(e)}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>
      </Box>

      {/* View Result Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Result Details</Typography>
            <IconButton onClick={handleCloseViewDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewDialog.result && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Student</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.student?.user?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Enrollment Number</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.student?.enrollmentNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Exam Name</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.examName}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Exam Type</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                  {viewDialog.result.examType}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Subject</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.subject}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Exam Date</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.examDate
                    ? format(new Date(viewDialog.result.examDate), 'MMM dd, yyyy')
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Marks Obtained</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.marks?.obtained || 0} / {viewDialog.result.marks?.total || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Percentage</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.marks?.percentage?.toFixed(1) || 0}%
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">Grade</Typography>
                <Chip
                  label={viewDialog.result.marks?.grade || 'N/A'}
                  sx={{
                    bgcolor: getGradeColor(viewDialog.result.marks?.grade),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">GPA</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {viewDialog.result.marks?.gpa?.toFixed(2) || 'N/A'}
                </Typography>
              </Grid>
              {viewDialog.result.remarks && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Remarks</Typography>
                  <Typography variant="body1">{viewDialog.result.remarks}</Typography>
                </Grid>
              )}
              {viewDialog.result.teacherRemarks && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Teacher Remarks</Typography>
                  <Typography variant="body1">{viewDialog.result.teacherRemarks}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Results;
