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
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  AccountBalance,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  useEffect(() => {
    // Auto-set institution filter from selected institution
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData && !selectedInstitution) {
      try {
        const institution = JSON.parse(institutionData);
        setSelectedInstitution(institution._id);
        return; // Return early to avoid duplicate fetch
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    }

    fetchData();
  }, [selectedInstitution]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch institutions if super admin
      if (isSuperAdmin) {
        const instResponse = await axios.get('http://localhost:5000/api/v1/institutions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInstitutions(instResponse.data.data);
      }

      // Fetch departments
      let url = 'http://localhost:5000/api/v1/departments';
      if (selectedInstitution) {
        url += `?institution=${selectedInstitution}`;
      }

      const deptResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDepartments(deptResponse.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (departmentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/departments/${departmentId}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh list
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Departments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage academic departments
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/departments/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Department
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            fullWidth
            placeholder="Search by name or code..."
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

          {isSuperAdmin && (
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>Institution</InputLabel>
              <Select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                label="Institution"
              >
                <MenuItem value="">All Institutions</MenuItem>
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                {isSuperAdmin && <TableCell><strong>Institution</strong></TableCell>}
                <TableCell><strong>Head</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
                <TableCell><strong>Teachers</strong></TableCell>
                <TableCell><strong>Students</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 9 : 8} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No departments found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((department) => (
                  <TableRow key={department._id} hover>
                    <TableCell>
                      <Chip label={department.code} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccountBalance fontSize="small" color="action" />
                        <Typography variant="body2">{department.name}</Typography>
                      </Box>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Typography variant="body2">
                          {department.institution?.name}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2">
                        {department.head?.name || 'Not assigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {department.building || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{department.stats?.totalTeachers || 0}</TableCell>
                    <TableCell>{department.stats?.totalStudents || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={department.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={department.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/departments/edit/${department._id}`)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color={department.isActive ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(department._id)}
                      >
                        {department.isActive ? (
                          <ToggleOff fontSize="small" />
                        ) : (
                          <ToggleOn fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default Departments;
