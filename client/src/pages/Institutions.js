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
} from '@mui/material';
import {
  Add,
  Edit,
  School,
  Business,
  Search,
  ToggleOn,
  ToggleOff,
} from '@mui/icons-material';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Institutions = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');

  useEffect(() => {
    fetchOrganizations();
    fetchInstitutions();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrganizations(response.data.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setInstitutions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/institutions/${institutionId}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh list
      fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrganization = !selectedOrganization || 
      (inst.organization && inst.organization._id === selectedOrganization);
    return matchesSearch && matchesOrganization;
  });

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
              Institutions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all schools and colleges
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/institutions/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Institution
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search and Filter */}
        <Box display="flex" gap={2} sx={{ mb: 3 }}>
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Organization</InputLabel>
            <Select
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              label="Filter by Organization"
            >
              <MenuItem value="">All Organizations</MenuItem>
              {organizations.map((org) => (
                <MenuItem key={org._id} value={org._id}>
                  {org.name} ({org.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Organization</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
                <TableCell><strong>Students</strong></TableCell>
                <TableCell><strong>Teachers</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstitutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No institutions found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInstitutions.map((institution) => (
                  <TableRow key={institution._id} hover>
                    <TableCell>
                      <Chip label={institution.code} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {institution.type === 'school' ? (
                          <School fontSize="small" color="action" />
                        ) : (
                          <Business fontSize="small" color="action" />
                        )}
                        <Typography variant="body2">{institution.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={institution.organization?.name || 'N/A'}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={institution.type.toUpperCase()}
                        size="small"
                        color={institution.type === 'school' ? 'success' : 'info'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {institution.address.city}, {institution.address.state}
                      </Typography>
                    </TableCell>
                    <TableCell>{institution.stats?.totalStudents || 0}</TableCell>
                    <TableCell>{institution.stats?.totalTeachers || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={institution.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={institution.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/institutions/edit/${institution._id}`)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color={institution.isActive ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(institution._id)}
                      >
                        {institution.isActive ? (
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

export default Institutions;
