import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon, ArrowBack, FileDownload } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getApiUrl } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { notifyError, notifySuccess } from '../utils/notify';

const ImportStudents = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file type
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      // Get selected institution from localStorage
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      if (selectedInstitutionStr) {
        try {
          const selectedInstitution = JSON.parse(selectedInstitutionStr);
          if (selectedInstitution && selectedInstitution._id) {
            formData.append('institutionId', selectedInstitution._id);
          }
        } catch (e) {
          console.error('Error parsing selected institution:', e);
        }
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(getApiUrl('admissions/import'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setResult(response.data.data);
      setFile(null);
      notifySuccess(`Import completed: ${response.data.data.successCount} students imported.`);
      // Reset file input
      document.getElementById('file-upload').value = '';
    } catch (err) {
      console.error('Import error:', err);
      const msg = err.response?.data?.message || 'Failed to import students';
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Student Name': 'Muhammad Ali',
          'Father Name': 'Tariq Mehmood',
          'Date Of Birth': '2015-05-14',
          'Gender': 'Male',
          'Class Name': 'Grade-1',
          'Section Name': 'A',
          'Roll Number': '101',
          'Admission Number': 'ADM-1001',
          'Mobile Number': '03001234567',
          'Guardian CNIC': '37405-1234567-1',
          'Student Address': 'House # 12, Street 3, Islamabad',
          'Student Status': 'Enrolled',
          'Religion': 'Islam',
          'Student Category': 'General'
        },
        {
          'Student Name': 'Fatima Zahra',
          'Father Name': 'Zahid Hussain',
          'Date Of Birth': '2016-08-20',
          'Gender': 'Female',
          'Class Name': 'Grade-1',
          'Section Name': 'B',
          'Roll Number': '102',
          'Admission Number': 'ADM-1002',
          'Mobile Number': '03129876543',
          'Guardian CNIC': '37405-7654321-2',
          'Student Address': 'House # 45, Street 8, Rawalpindi',
          'Student Status': 'Enrolled',
          'Religion': 'Islam',
          'Student Category': 'General'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      // Set column widths so all headers and sample text are fully readable
      worksheet['!cols'] = [
        { wch: 18 }, // Student Name
        { wch: 18 }, // Father Name
        { wch: 14 }, // Date Of Birth
        { wch: 10 }, // Gender
        { wch: 14 }, // Class Name
        { wch: 14 }, // Section Name
        { wch: 14 }, // Roll Number
        { wch: 18 }, // Admission Number
        { wch: 16 }, // Mobile Number
        { wch: 18 }, // Guardian CNIC
        { wch: 32 }, // Student Address
        { wch: 15 }, // Student Status
        { wch: 12 }, // Religion
        { wch: 16 }  // Student Category
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, 'Students_Import_Template.xlsx');
      notifySuccess('Template downloaded successfully');
    } catch (err) {
      console.error('Error generating template:', err);
      notifyError('Failed to generate template');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', pb: 4 }}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 3
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Button 
                  startIcon={<ArrowBack />} 
                  onClick={() => navigate('/admissions')}
                  sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              >
                  Back to Admissions
              </Button>
              <Typography variant="h4" fontWeight="bold">
                Import Students
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                boxShadow: 2,
                '&:hover': {
                  bgcolor: '#f8f9fa',
                  color: '#5a6fd6'
                }
              }}
            >
              Download Template
            </Button>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Upload an Excel file (.xlsx) to bulk import student admissions. You can download the sample template to populate your records.
          </Typography>
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box 
            sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 6, 
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: '#fafafa',
              '&:hover': { bgcolor: '#f0f0f0', borderColor: '#667eea' }
            }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <CloudUpload sx={{ fontSize: 60, color: '#667eea', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {file ? file.name : 'Click to select or drag and drop Excel file'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Supported formats: .xlsx, .xls
            </Typography>
          </Box>

          <Box mt={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
              sx={{
                borderColor: '#667eea',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  borderColor: '#5a6fd6',
                  bgcolor: 'rgba(102, 126, 234, 0.08)'
                }
              }}
            >
              Download Excel Template
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
              sx={{ minWidth: 150, bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
            >
              {loading ? 'Importing...' : 'Start Import'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box mt={4}>
              <Alert 
                severity={result.errorCount > 0 ? "warning" : "success"}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Import Completed
                </Typography>
                <Typography variant="body2">
                  Successfully imported: {result.successCount}
                </Typography>
                {result.errorCount > 0 && (
                  <Typography variant="body2">
                    Failed records: {result.errorCount}
                  </Typography>
                )}
              </Alert>

              {result.errors.length > 0 && (
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom color="error">
                    Error Details
                  </Typography>
                  <List sx={{ bgcolor: '#fff0f0', borderRadius: 2 }}>
                    {result.errors.map((err, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon>
                            <ErrorIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Row ${err.row}: ${err.name}`}
                            secondary={err.error}
                            primaryTypographyProps={{ fontWeight: 'medium' }}
                          />
                        </ListItem>
                        {index < result.errors.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Paper>
        
        <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle2" color="textSecondary" fontWeight="bold">
                    Expected Columns:
                </Typography>
                <Button
                    size="small"
                    startIcon={<FileDownload />}
                    onClick={handleDownloadTemplate}
                    sx={{ textTransform: 'none', color: '#667eea', fontWeight: 600 }}
                >
                    Download Template with Sample Data
                </Button>
            </Box>
            <Paper sx={{ p: 2.5, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', lineHeight: 2, color: '#334155' }}>
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>* Required:</span> Student Name, Father Name<br/>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Academic:</span> Class Name, Section Name, Admission Number, Roll Number, Student Status (Enrolled / Pending / Struck Off)<br/>
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>Personal & Contact:</span> Date Of Birth (YYYY-MM-DD), Gender (Male / Female), Mobile Number, Guardian CNIC, Student Address, Religion, Student Category
                </Typography>
            </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default ImportStudents;
