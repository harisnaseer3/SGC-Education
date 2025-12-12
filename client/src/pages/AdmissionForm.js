import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { ArrowBack, Save, ArrowForward } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAdmission, updateAdmission, getAdmissionById } from '../services/admissionService';
import axios from 'axios';

const steps = ['Personal Information', 'Contact Details', 'Guardian Information', 'Academic Background'];

const AdmissionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    institution: '',
    department: '',
    academicYear: new Date().getFullYear().toString(),
    program: '',
    personalInfo: {
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      nationality: 'Indian',
      religion: '',
      category: 'General',
    },
    contactInfo: {
      email: '',
      phone: '',
      alternatePhone: '',
      currentAddress: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      },
      permanentAddress: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      },
      sameAsCurrent: false,
    },
    guardianInfo: {
      fatherName: '',
      fatherOccupation: '',
      fatherPhone: '',
      motherName: '',
      motherOccupation: '',
      motherPhone: '',
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      guardianEmail: '',
      annualIncome: '',
    },
    academicBackground: {
      previousSchool: '',
      previousBoard: '',
      previousClass: '',
      previousPercentage: '',
      yearOfPassing: '',
    },
  });

  useEffect(() => {
    fetchInstitutions();
    if (isEditMode) {
      fetchAdmissionData();
    }
  }, [id]);

  useEffect(() => {
    if (formData.institution) {
      fetchDepartments(formData.institution);
    }
  }, [formData.institution]);

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data);

      // Auto-select institution if not super admin
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'super_admin' && user.institution) {
        setFormData(prev => ({ ...prev, institution: user.institution }));
      }
    } catch (err) {
      setError('Failed to fetch institutions');
    }
  };

  const fetchDepartments = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/departments?institution=${institutionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.data);
    } catch (err) {
      setError('Failed to fetch departments');
    }
  };

  const fetchAdmissionData = async () => {
    try {
      setLoading(true);
      const response = await getAdmissionById(id);
      const admission = response.data;
      setFormData({
        institution: admission.institution._id,
        department: admission.department._id,
        academicYear: admission.academicYear,
        program: admission.program,
        personalInfo: admission.personalInfo,
        contactInfo: admission.contactInfo,
        guardianInfo: admission.guardianInfo,
        academicBackground: admission.academicBackground,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admission data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddressChange = (addressType, field, value) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [addressType]: {
          ...prev.contactInfo[addressType],
          [field]: value,
        },
      },
    }));
  };

  const handleSameAsCurrentChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        sameAsCurrent: checked,
        permanentAddress: checked ? { ...prev.contactInfo.currentAddress } : prev.contactInfo.permanentAddress,
      },
    }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (isEditMode) {
        await updateAdmission(id, formData);
        setSuccess('Admission updated successfully');
      } else {
        await createAdmission(formData);
        setSuccess('Admission application submitted successfully');
      }

      setTimeout(() => {
        navigate('/admissions');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit admission');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Institution</InputLabel>
                <Select
                  value={formData.institution}
                  onChange={(e) => handleChange(null, 'institution', e.target.value)}
                  label="Institution"
                >
                  {institutions.map((inst) => (
                    <MenuItem key={inst._id} value={inst._id}>
                      {inst.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => handleChange(null, 'department', e.target.value)}
                  label="Department"
                  disabled={!formData.institution}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Academic Year"
                required
                value={formData.academicYear}
                onChange={(e) => handleChange(null, 'academicYear', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Program"
                required
                value={formData.program}
                onChange={(e) => handleChange(null, 'program', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>Personal Details</Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="First Name"
                required
                value={formData.personalInfo.firstName}
                onChange={(e) => handleChange('personalInfo', 'firstName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Middle Name"
                value={formData.personalInfo.middleName}
                onChange={(e) => handleChange('personalInfo', 'middleName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Last Name"
                required
                value={formData.personalInfo.lastName}
                onChange={(e) => handleChange('personalInfo', 'lastName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                required
                InputLabelProps={{ shrink: true }}
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => handleChange('personalInfo', 'dateOfBirth', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.personalInfo.gender}
                  onChange={(e) => handleChange('personalInfo', 'gender', e.target.value)}
                  label="Gender"
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Blood Group</InputLabel>
                <Select
                  value={formData.personalInfo.bloodGroup}
                  onChange={(e) => handleChange('personalInfo', 'bloodGroup', e.target.value)}
                  label="Blood Group"
                >
                  <MenuItem value="A+">A+</MenuItem>
                  <MenuItem value="A-">A-</MenuItem>
                  <MenuItem value="B+">B+</MenuItem>
                  <MenuItem value="B-">B-</MenuItem>
                  <MenuItem value="AB+">AB+</MenuItem>
                  <MenuItem value="AB-">AB-</MenuItem>
                  <MenuItem value="O+">O+</MenuItem>
                  <MenuItem value="O-">O-</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Nationality"
                required
                value={formData.personalInfo.nationality}
                onChange={(e) => handleChange('personalInfo', 'nationality', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.personalInfo.category}
                  onChange={(e) => handleChange('personalInfo', 'category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="OBC">OBC</MenuItem>
                  <MenuItem value="SC">SC</MenuItem>
                  <MenuItem value="ST">ST</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                required
                value={formData.contactInfo.email}
                onChange={(e) => handleChange('contactInfo', 'email', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                required
                value={formData.contactInfo.phone}
                onChange={(e) => handleChange('contactInfo', 'phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Alternate Phone"
                value={formData.contactInfo.alternatePhone}
                onChange={(e) => handleChange('contactInfo', 'alternatePhone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>Current Address</Divider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={formData.contactInfo.currentAddress.street}
                onChange={(e) => handleAddressChange('currentAddress', 'street', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City"
                value={formData.contactInfo.currentAddress.city}
                onChange={(e) => handleAddressChange('currentAddress', 'city', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State"
                value={formData.contactInfo.currentAddress.state}
                onChange={(e) => handleAddressChange('currentAddress', 'state', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.contactInfo.currentAddress.country}
                onChange={(e) => handleAddressChange('currentAddress', 'country', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.contactInfo.currentAddress.pincode}
                onChange={(e) => handleAddressChange('currentAddress', 'pincode', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.contactInfo.sameAsCurrent}
                    onChange={(e) => handleSameAsCurrentChange(e.target.checked)}
                  />
                }
                label="Permanent address same as current address"
              />
            </Grid>
            {!formData.contactInfo.sameAsCurrent && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>Permanent Address</Divider>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={formData.contactInfo.permanentAddress.street}
                    onChange={(e) => handleAddressChange('permanentAddress', 'street', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.contactInfo.permanentAddress.city}
                    onChange={(e) => handleAddressChange('permanentAddress', 'city', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="State"
                    value={formData.contactInfo.permanentAddress.state}
                    onChange={(e) => handleAddressChange('permanentAddress', 'state', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Country"
                    value={formData.contactInfo.permanentAddress.country}
                    onChange={(e) => handleAddressChange('permanentAddress', 'country', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Pincode"
                    value={formData.contactInfo.permanentAddress.pincode}
                    onChange={(e) => handleAddressChange('permanentAddress', 'pincode', e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Father's Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Father's Name"
                value={formData.guardianInfo.fatherName}
                onChange={(e) => handleChange('guardianInfo', 'fatherName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Father's Occupation"
                value={formData.guardianInfo.fatherOccupation}
                onChange={(e) => handleChange('guardianInfo', 'fatherOccupation', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Father's Phone"
                value={formData.guardianInfo.fatherPhone}
                onChange={(e) => handleChange('guardianInfo', 'fatherPhone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Mother's Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mother's Name"
                value={formData.guardianInfo.motherName}
                onChange={(e) => handleChange('guardianInfo', 'motherName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mother's Occupation"
                value={formData.guardianInfo.motherOccupation}
                onChange={(e) => handleChange('guardianInfo', 'motherOccupation', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mother's Phone"
                value={formData.guardianInfo.motherPhone}
                onChange={(e) => handleChange('guardianInfo', 'motherPhone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Guardian Information</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Guardian Name"
                value={formData.guardianInfo.guardianName}
                onChange={(e) => handleChange('guardianInfo', 'guardianName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Guardian Relation"
                value={formData.guardianInfo.guardianRelation}
                onChange={(e) => handleChange('guardianInfo', 'guardianRelation', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Guardian Phone"
                value={formData.guardianInfo.guardianPhone}
                onChange={(e) => handleChange('guardianInfo', 'guardianPhone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Guardian Email"
                type="email"
                value={formData.guardianInfo.guardianEmail}
                onChange={(e) => handleChange('guardianInfo', 'guardianEmail', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Annual Income"
                type="number"
                value={formData.guardianInfo.annualIncome}
                onChange={(e) => handleChange('guardianInfo', 'annualIncome', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Previous School"
                value={formData.academicBackground.previousSchool}
                onChange={(e) => handleChange('academicBackground', 'previousSchool', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Previous Board"
                value={formData.academicBackground.previousBoard}
                onChange={(e) => handleChange('academicBackground', 'previousBoard', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Previous Class"
                value={formData.academicBackground.previousClass}
                onChange={(e) => handleChange('academicBackground', 'previousClass', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Previous Percentage"
                type="number"
                value={formData.academicBackground.previousPercentage}
                onChange={(e) => handleChange('academicBackground', 'previousPercentage', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Year of Passing"
                type="number"
                value={formData.academicBackground.yearOfPassing}
                onChange={(e) => handleChange('academicBackground', 'yearOfPassing', e.target.value)}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (loading && isEditMode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/admissions')} sx={{ mr: 2 }}>
            Back
          </Button>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {isEditMode ? 'Edit Admission' : 'New Admission Application'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode ? 'Update admission application details' : 'Fill in the application details'}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4, mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {loading ? 'Submitting...' : isEditMode ? 'Update Application' : 'Submit Application'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdmissionForm;
