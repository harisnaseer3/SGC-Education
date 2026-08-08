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
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Search,
  Close,
  Print,
  Person,
  Home,
  FamilyRestroom,
  School,
  CalendarToday,
  PhotoCamera,
  LocationOn,
  Phone,
  Email,
  Work,
  AccountCircle,
  Info,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { notifyError, notifySuccess } from '../utils/notify';
import {
  createAdmission,
  updateAdmission,
  getAdmissionById,
  updateAdmissionStatus,
  approveAndEnroll,
  getNextRollNumber
} from '../services/admissionService';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { capitalizeFirstOnly } from '../utils/textUtils';

const formGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, 1fr)',
    md: 'repeat(4, 1fr)',
  },
  gap: 2,
  width: '100%',
  boxSizing: 'border-box',
};

const gridColSx = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
};

const fullWidthColSx = {
  gridColumn: {
    xs: 'span 1',
    sm: 'span 2',
    md: 'span 4',
  },
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
};

const fieldSx = {
  width: '100%',
  minWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  '& .MuiOutlinedInput-root': {
    width: '100%',
    minWidth: '100%',
    bgcolor: '#f8fafc',
    borderRadius: '8px',
    height: '50px',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#1e293b',
    boxSizing: 'border-box',
    '& fieldset': {
      borderColor: '#cbd5e1',
    },
    '&:hover fieldset': {
      borderColor: '#6366f1',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366f1',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#475569',
    '&.Mui-focused': {
      color: '#6366f1',
    },
  },
};

const selectSx = {
  width: '100%',
  minWidth: '100%',
  display: 'flex',
  bgcolor: '#f8fafc',
  borderRadius: '8px',
  height: '50px',
  fontSize: '0.9rem',
  fontWeight: 500,
  color: '#1e293b',
  boxSizing: 'border-box',
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    py: '12px',
    width: '100%',
    minWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#cbd5e1',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#6366f1',
    borderWidth: '2px',
  },
};

const checkboxBoxSx = {
  width: '100%',
  height: '50px',
  display: 'flex',
  alignItems: 'center',
  px: 2,
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  bgcolor: '#f8fafc',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: '#6366f1',
  },
};

const uploadButtonSx = {
  width: '100%',
  height: '50px',
  borderRadius: '8px',
  borderColor: '#cbd5e1',
  color: '#475569',
  bgcolor: '#f8fafc',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  boxShadow: 'none',
  boxSizing: 'border-box',
  '&:hover': {
    borderColor: '#6366f1',
    bgcolor: 'rgba(99, 102, 241, 0.05)',
  },
};

const user = JSON.parse(localStorage.getItem('user') || '{}');

const createInitialFormData = (userCtx) => ({
  // Basic Info
  class: '',
  section: '',
  group: '',
  admissionDate: new Date().toISOString().split('T')[0],
  studentName: '',
  fatherName: '',
  dateOfBirth: '',
  rollNumber: '',
  religion: 'Islam',
  gender: 'Male',
  admEffectNo: new Date().toISOString().split('T')[0],
  markAsEnrolled: false,
  orphan: 'NO',
  studentPicture: null,
  status: 'pending',

  // Address - Present
  presentAddress: {
    address: '',
    country: 'Pakistan',
    customCountry: '',
    city: 'Islamabad',
    customCity: '',
  },
  // Address - Permanent
  permanentAddress: {
    address: '',
    country: 'Pakistan',
    customCountry: '',
    city: 'Islamabad',
    customCity: '',
  },

  // Guardian - Father
  father: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    forApplicationLogin: false,
    forSMS: false,
    forWhatsappSMS: false,
    phoneNumberOffice: '',
    whatsappMobileNumber: '',
    occupation: '',
    emailAddress: '',
  },
  // Guardian - Mother
  mother: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    forApplicationLogin: false,
    forSMS: false,
    forWhatsappSMS: false,
    phoneNumberOffice: '',
    whatsappMobileNumber: '',
    occupation: '',
    emailAddress: '',
  },
  // Guardian - Guardian
  guardian: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    relation: '',
  },

  // Backend required fields (hidden)
  institution: userCtx.institution
    ? (typeof userCtx.institution === 'object' ? userCtx.institution._id : userCtx.institution)
    : '',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  program: '',
});

const AdmissionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/admissions');
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Address tab state
  const [addressTab, setAddressTab] = useState(0);


  // Dropdown data
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [religions, setReligions] = useState(['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Buddhism', 'Other']);
  const [countries, setCountries] = useState(['Pakistan', 'Other']);
  const [cities, setCities] = useState(['Islamabad', 'Rawalpindi', 'Lahore', 'Other']);
  const [mobileOperators, setMobileOperators] = useState(['Jazz', 'Telenor', 'Ufone', 'Zong', 'Warid']);

  // Dialog states for adding new items
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', code: '' });
  const [newSection, setNewSection] = useState({ name: '', code: '' });
  const [newGroup, setNewGroup] = useState({ name: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const getInstitutionId = () => {
    // Super admins use the navbar selection
    if (user.role === 'super_admin') {
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      if (selectedInstitutionStr) {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          return parsed?._id || parsed;
        } catch (e) {
          return selectedInstitutionStr;
        }
      }
    }

    // For other roles or as fallback, use user.institution
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }

    return null;
  };

  const [formData, setFormData] = useState(() => {
    const initialData = createInitialFormData(user);
    // Override institution with selected institution from navbar if available
    const institutionId = getInstitutionId();
    if (institutionId) {
      initialData.institution = institutionId;
    }
    return initialData;
  });

  useEffect(() => {
    if (isEditMode) {
      // For edit/view mode: fetch admission data first, then fetch dropdowns with correct institution
      fetchAdmissionDataAndDropdowns();
    } else {
      // For new admission: fetch dropdowns with current institution
      fetchClasses();
      fetchSections();
      const institutionId = getInstitutionId();
      fetchGroups(institutionId);
      fetchNextAvailableRollNumber(institutionId);
    }

    // Update institution when selectedInstitution changes
    const handleStorageChange = () => {
      const institutionId = getInstitutionId();
      if (institutionId && !isEditMode) {
        setFormData(prev => ({ ...prev, institution: institutionId }));
        fetchNextAvailableRollNumber(institutionId);
        fetchClassesWithInstitution(institutionId);
        fetchSectionsWithInstitution(institutionId);
        fetchGroups(institutionId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('institutionChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('institutionChanged', handleStorageChange);
    };
  }, [id, isEditMode]);

  const fetchClasses = async () => {
    const institutionId = getInstitutionId();
    return fetchClassesWithInstitution(institutionId);
  };

  const fetchSections = async () => {
    const institutionId = getInstitutionId();
    return fetchSectionsWithInstitution(institutionId);
  };

  const fetchGroups = async (institutionIdParam) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      const institutionId = institutionIdParam || getInstitutionId();
      if (institutionId) {
        params.institution = institutionId;
      }
      const response = await axios.get(getApiUrl('groups'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setGroups(response.data.data || []);
    } catch (err) {
      notifyError('Error fetching groups: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintBlankForm = () => {
    const saved = formData;
    setFormData(createInitialFormData(user));
    setTimeout(() => {
      window.print();
      setFormData(saved);
    }, 150);
  };

  // Format CNIC with dashes (XXXXX-XXXXXXX-X)
  const formatCNIC = (value) => {
    if (!value) return '';
    // Remove all non-digits
    const digits = value.toString().replace(/\D/g, '');

    // Limit to 13 digits
    const limited = digits.slice(0, 13);

    // Format with dashes
    if (limited.length <= 5) {
      return limited;
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 5)}-${limited.slice(5)}`;
    } else {
      return `${limited.slice(0, 5)}-${limited.slice(5, 12)}-${limited.slice(12)}`;
    }
  };

  // Strip dashes from CNIC
  const stripCNIC = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  // Validate CNIC format
  const validateCNIC = (value) => {
    if (!value) return true; // Allow empty (optional field)
    const digits = stripCNIC(value);
    return digits.length === 13;
  };

  // Validate Phone format (at least 10 digits)
  const validatePhone = (value) => {
    if (!value) return true; // Allow empty
    const digits = value.toString().replace(/\D/g, '');
    return digits.length >= 10;
  };

  // Fetch classes with specific institution
  const fetchClassesWithInstitution = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};

      if (institutionId) {
        params.institution = institutionId;
      }

      const response = await axios.get(getApiUrl('classes'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setClasses(response.data.data || []);
    } catch (err) {
      notifyError('Failed to load classes. Please refresh the page.');
    }
  };

  const fetchNextAvailableRollNumber = async (institutionId) => {
    try {
      const response = await getNextRollNumber(institutionId);
      if (response.success && response.data) {
        setFormData(prev => ({ ...prev, rollNumber: response.data }));
      }
    } catch (err) {
      console.error('Error fetching next roll number:', err);
    }
  };

  // Fetch sections with specific institution
  const fetchSectionsWithInstitution = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};

      if (institutionId) {
        params.institution = institutionId;
      }

      const response = await axios.get(getApiUrl('sections'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setSections(response.data.data || []);
    } catch (err) {
      notifyError('Failed to load sections. Please refresh the page.');
    }
  };

  // Fetch admission data and then fetch dropdowns with the correct institution
  const fetchAdmissionDataAndDropdowns = async () => {
    try {
      setLoading(true);
      const response = await getAdmissionById(id);
      const admission = response.data;

      // Get institution from admission (prioritize admission's institution)
      const admissionInstitutionId = admission.institution?._id || admission.institution;
      const institutionId = admissionInstitutionId || getInstitutionId();

      // Fetch dropdowns with the admission's institution
      await Promise.all([
        fetchClassesWithInstitution(institutionId),
        fetchSectionsWithInstitution(institutionId),
        fetchGroups(institutionId)
      ]);

      // Map backend data to form structure
      // If studentId exists (enrolled), prefer data from Student model, otherwise use Admission model
      const student = admission.studentId;
      const guardianInfo = student?.guardianInfo || admission.guardianInfo;

      // Section Fix: If enrolled student has section string (e.g. "A"), find matching section ID
      let preloadedSection = admission.section?._id || admission.section || '';
      if (!preloadedSection && student?.section) {
        // Try to find section ID by name in current institution's sections
        const matchingSection = sections.find(s => s.name === student.section);
        if (matchingSection) preloadedSection = matchingSection._id;
      }

      setFormData(prev => ({
        ...prev,
        class: admission.class?._id || admission.class || '',
        section: preloadedSection,
        // Group comes from the class if available
        group: admission.class?.group?._id || admission.class?.group || admission.group?._id || admission.group || '',
        admissionDate: admission.admissionDate ? new Date(admission.admissionDate).toISOString().split('T')[0] : prev.admissionDate,
        // Use the name field from personalInfo
        studentName: admission.personalInfo?.name || '',
        fatherName: guardianInfo?.fatherName || '',
        dateOfBirth: admission.personalInfo?.dateOfBirth ? new Date(admission.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
        // Roll number comes from Student model if enrolled, otherwise Admission fallback
        rollNumber: student?.rollNumber || admission.rollNumber || prev.rollNumber || '',
        religion: admission.personalInfo?.religion || 'Islam',
        gender: admission.personalInfo?.gender ? admission.personalInfo.gender.charAt(0).toUpperCase() + admission.personalInfo.gender.slice(1) : 'Male',
        admEffectNo: admission.admissionEffectiveDate ? new Date(admission.admissionEffectiveDate).toISOString().split('T')[0] : (admission.admissionDate ? new Date(admission.admissionDate).toISOString().split('T')[0] : prev.admEffectNo),
        institution: admission.institution?._id || admission.institution || prev.institution,
        academicYear: admission.academicYear || student?.academicYear || prev.academicYear,
        program: admission.program || student?.program || prev.program,
        status: admission.status || 'pending',
        // Address - Present (from currentAddress)
        presentAddress: {
          address: admission.contactInfo?.currentAddress?.street || '',
          country: ['Pakistan'].includes(admission.contactInfo?.currentAddress?.country) ? (admission.contactInfo?.currentAddress?.country || 'Pakistan') : (admission.contactInfo?.currentAddress?.country ? 'Other' : 'Pakistan'),
          customCountry: ['Pakistan'].includes(admission.contactInfo?.currentAddress?.country) ? '' : (admission.contactInfo?.currentAddress?.country || ''),
          city: ['Islamabad', 'Rawalpindi', 'Lahore'].includes(admission.contactInfo?.currentAddress?.city) ? (admission.contactInfo?.currentAddress?.city || 'Islamabad') : (admission.contactInfo?.currentAddress?.city ? 'Other' : 'Islamabad'),
          customCity: ['Islamabad', 'Rawalpindi', 'Lahore'].includes(admission.contactInfo?.currentAddress?.city) ? '' : (admission.contactInfo?.currentAddress?.city || ''),
        },
        // Address - Permanent (from permanentAddress)
        permanentAddress: {
          address: admission.contactInfo?.permanentAddress?.street || '',
          country: ['Pakistan'].includes(admission.contactInfo?.permanentAddress?.country) ? (admission.contactInfo?.permanentAddress?.country || 'Pakistan') : (admission.contactInfo?.permanentAddress?.country ? 'Other' : 'Pakistan'),
          customCountry: ['Pakistan'].includes(admission.contactInfo?.permanentAddress?.country) ? '' : (admission.contactInfo?.permanentAddress?.country || ''),
          city: ['Islamabad', 'Rawalpindi', 'Lahore'].includes(admission.contactInfo?.permanentAddress?.city) ? (admission.contactInfo?.permanentAddress?.city || 'Islamabad') : (admission.contactInfo?.permanentAddress?.city ? 'Other' : 'Islamabad'),
          customCity: ['Islamabad', 'Rawalpindi', 'Lahore'].includes(admission.contactInfo?.permanentAddress?.city) ? '' : (admission.contactInfo?.permanentAddress?.city || ''),
        },
        father: {
          name: guardianInfo?.fatherName || '',
          occupation: guardianInfo?.fatherOccupation || '',
          mobileNumber: guardianInfo?.fatherPhone || '',
          cnic: '',
          emailAddress: guardianInfo?.fatherEmail || '',
          mobileOperator: 'Jazz',
          forApplicationLogin: false,
          forSMS: false,
          forWhatsappSMS: false,
          phoneNumberOffice: '',
          whatsappMobileNumber: '',
        },
        mother: {
          name: guardianInfo?.motherName || '',
          occupation: guardianInfo?.motherOccupation || '',
          mobileNumber: guardianInfo?.motherPhone || '',
          cnic: '',
          emailAddress: guardianInfo?.motherEmail || '',
          mobileOperator: 'Jazz',
          forApplicationLogin: false,
          forSMS: false,
          forWhatsappSMS: false,
          phoneNumberOffice: '',
          whatsappMobileNumber: '',
        },
        guardian: {
          name: guardianInfo?.guardianName || '',
          relation: guardianInfo?.guardianRelation || '',
          mobileNumber: guardianInfo?.guardianPhone || '',
          emailAddress: guardianInfo?.guardianEmail || '',
          cnic: '',
          mobileOperator: 'Jazz',
        },
      }));
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to fetch admission data');
    } finally {
      setLoading(false);
    }
  };

  // Legacy function for backward compatibility (used in new admission mode)
  const fetchAdmissionData = async () => {
    return fetchAdmissionDataAndDropdowns();
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset section when class changes
      if (field === 'class') {
        updated.section = '';
      }
      return updated;
    });
  };

  const handleNestedChange = (section, field, value) => {
    // Special handling for CNIC fields
    if (field === 'cnic') {
      const formatted = formatCNIC(value);
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: formatted,
        },
      }));
    } else if (field === 'mobileNumber') {
      // Allow only digits and limit to 11 characters
      if (/^\d*$/.test(value) && value.length <= 11) {
        setFormData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value,
          },
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, studentPicture: file }));
    }
  };

  const handleAddClass = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Build payload without empty/invalid fields
      const payload = {
        name: newClass.name,
        code: newClass.code,
        institution: user.institution || undefined,
        academicYear: formData.academicYear,
        // Note: group, and feeType are required by the backend
        // For now, we'll use placeholder values or require the user to add them via the Classes page
      };
      
      const response = await axios.post(
        getApiUrl('classes'),
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClasses([...classes, response.data.data]);
      setFormData(prev => ({ ...prev, class: response.data.data._id }));
      setClassDialogOpen(false);
      setNewClass({ name: '', code: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add class');
    }
  };

  const handleAddSection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl('sections'),
        {
          name: newSection.name,
          code: newSection.code,
          class: formData.class,
          institution: user.institution || undefined,
          academicYear: formData.academicYear,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSections([...sections, response.data.data]);
      setFormData(prev => ({ ...prev, section: response.data.data._id }));
      setSectionDialogOpen(false);
      setNewSection({ name: '', code: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add section');
    }
  };

  const handleAddGroup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl('groups'),
        {
          name: newGroup.name,
          institution: user.institution || undefined,
          academicYear: formData.academicYear,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups([...groups, response.data.data]);
      setFormData(prev => ({ ...prev, group: response.data.data._id }));
      setGroupDialogOpen(false);
      setNewGroup({ name: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add group');
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Map form data to backend structure
      // We only have a single "Name" field, so store it directly in personalInfo.name
      const name = formData.studentName.trim();

      // Get institution ID - check multiple sources
      let institutionId = getInstitutionId();
      
      // If still no institution, try formData
      if (!institutionId && formData.institution) {
        institutionId = formData.institution;
      }
      
      // If still no institution and not super admin, use user's institution
      if (!institutionId && !isSuperAdmin && user.institution) {
        institutionId = typeof user.institution === 'object' && user.institution?._id 
          ? user.institution._id 
          : user.institution;
      }

      // Ensure institutionId is a string
      if (institutionId && typeof institutionId !== 'string') {
        institutionId = String(institutionId);
      }

      if (!institutionId) {
        setError('Institution is required. Please select an institution from the navbar or contact administrator.');
        setLoading(false);
        return;
      }

      const admissionData = {
        institution: institutionId,
        academicYear: formData.academicYear,
        program: formData.program || 'General',
        class: formData.class || undefined,
        section: formData.section || undefined,
        rollNumber: formData.rollNumber || undefined,
        admissionDate: formData.admissionDate,
        admissionEffectiveDate: formData.admEffectNo || formData.admissionDate,
        status: isEditMode ? formData.status : undefined, // Include status only in edit mode
        personalInfo: {
          name,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender.toLowerCase(),
          nationality: 'Pakistani',
          religion: formData.religion,
        },
        contactInfo: {
          email: formData.father.emailAddress || formData.mother.emailAddress || '',
          phone: formData.father.mobileNumber || formData.mother.mobileNumber || '',
          alternatePhone: formData.father.whatsappMobileNumber || '',
          currentAddress: {
            street: formData.presentAddress.address,
            city: formData.presentAddress.city === 'Other' ? (formData.presentAddress.customCity || 'Other') : formData.presentAddress.city,
            country: formData.presentAddress.country === 'Other' ? (formData.presentAddress.customCountry || 'Other') : formData.presentAddress.country,
          },
          permanentAddress: {
            street: formData.permanentAddress.address,
            city: formData.permanentAddress.city === 'Other' ? (formData.permanentAddress.customCity || 'Other') : formData.permanentAddress.city,
            country: formData.permanentAddress.country === 'Other' ? (formData.permanentAddress.customCountry || 'Other') : formData.permanentAddress.country,
          },
        },
        guardianInfo: {
          fatherName: formData.fatherName || formData.father.name,
          fatherOccupation: formData.father.occupation,
          fatherPhone: formData.father.mobileNumber,
          fatherCnic: formData.father.cnic ? stripCNIC(formData.father.cnic) : '',
          motherName: formData.mother.name,
          motherOccupation: formData.mother.occupation,
          motherPhone: formData.mother.mobileNumber,
          motherCnic: formData.mother.cnic ? stripCNIC(formData.mother.cnic) : '',
          guardianName: formData.guardian.name,
          guardianRelation: formData.guardian.relation,
          guardianPhone: formData.guardian.mobileNumber,
          guardianEmail: formData.guardian.emailAddress,
          guardianCnic: formData.guardian.cnic ? stripCNIC(formData.guardian.cnic) : '',
        },
      };

      let admissionId;
      if (isEditMode) {
        const response = await updateAdmission(id, admissionData);
        admissionId = id;
        setSuccess('Admission updated successfully');
        notifySuccess('Admission updated successfully');
      } else {
        const response = await createAdmission(admissionData);
        admissionId = response.data._id;
        setSuccess('Admission application submitted successfully');
        notifySuccess('Admission application submitted successfully');
      }

      // If "Mark as Enrolled" is checked, enroll the student
      if (formData.markAsEnrolled && admissionId) {
        try {
          // Enroll the student directly
          const currentAdmission = await getAdmissionById(admissionId);
          if (currentAdmission.data.status !== 'enrolled') {
            await updateAdmissionStatus(admissionId, 'enrolled', 'Auto-enrolled from admission form');
            setSuccess('Admission updated and student enrolled successfully');
            notifySuccess('Admission updated and student enrolled successfully');
          }
        } catch (enrollError) {
          // If enrollment fails, still show success for admission creation
          console.error('Enrollment error:', enrollError);
          const msg = enrollError.response?.data?.message || 'Admission created but enrollment failed. Please enroll manually.';
          setError(msg);
          notifyError(msg);
        }
      }

      setTimeout(() => {
        handleBack();
      }, 2000);
    } catch (err) {
      // Extract detailed error message from backend
      let errorMessage = 'Failed to submit admission';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.message) {
          errorMessage = errorData.message;
          
          // Parse Mongoose validation errors from message
          // Format: "ValidationError: Admission validation failed: personalInfo.name: Please provide name"
          if (errorMessage.includes('validation failed')) {
            // Extract the actual field error message
            const match = errorMessage.match(/: ([^:]+): (.+)$/);
            if (match) {
              const field = match[1].replace(/personalInfo\.|guardianInfo\.|contactInfo\./g, '');
              errorMessage = `${field}: ${match[2]}`;
            }
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', pb: 4 }}>
      <Container maxWidth={false} sx={{ mt: 3, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Enhanced Header with Gradient */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.1,
            }
          }}
        >
          <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
              <Box display="flex" alignItems="center" gap={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Button 
                  startIcon={<ArrowBack />} 
                  onClick={handleBack} 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    minWidth: 'auto',
                    px: 2,
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
                  }}
                >
                  Back
                </Button>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', mb: 0.5, fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.125rem' } }}>
                    {isEditMode ? 'Edit Admission' : 'New Student Admission'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {isEditMode ? 'Update student admission information' : 'Fill in the details to create a new admission'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                sx={{ 
                  width: { xs: '100%', sm: 'auto' },
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
                }}
                startIcon={<Print />}
                onClick={handlePrintBlankForm}
              >
                Print Blank Form
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >

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

          <Box component="form" onSubmit={handleSubmit}>
            {/* BASIC INFO Section */}
            <Box 
              sx={{ 
                mb: 4,
                p: { xs: 2, sm: 2.5, md: 3 },
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50' }}>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Student personal and academic details
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={formGridSx}>
                {/* Row 1 */}
                <Box sx={gridColSx}>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>CLASS*</InputLabel>
                    <Select
                      fullWidth
                      value={formData.class}
                      onChange={(e) => handleChange('class', e.target.value)}
                      label="CLASS*"
                      sx={selectSx}
                    >
                      <MenuItem value="">Select Class</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          {capitalizeFirstOnly(cls.name || '')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={gridColSx}>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>SECTION*</InputLabel>
                    <Select
                      fullWidth
                      value={formData.section}
                      onChange={(e) => handleChange('section', e.target.value)}
                      label="SECTION*"
                      disabled={!formData.class}
                      sx={selectSx}
                    >
                      <MenuItem value="">Select Section</MenuItem>
                      {sections
                        .filter(sec => {
                          if (!formData.class) return false;
                          const sectionClassId = sec.class?._id || sec.class;
                          return String(sectionClassId) === String(formData.class);
                        })
                        .map((section) => (
                          <MenuItem key={section._id} value={section._id}>
                            {capitalizeFirstOnly(section.name || '')}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={gridColSx}>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>GROUP*</InputLabel>
                    <Select
                      fullWidth
                      value={formData.group}
                      onChange={(e) => handleChange('group', e.target.value)}
                      label="GROUP*"
                      sx={selectSx}
                    >
                      <MenuItem value="">Select Groups</MenuItem>
                      {groups.map((group) => (
                        <MenuItem key={group._id} value={group._id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    required
                    label="ADMISSION DATE*"
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => handleChange('admissionDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                  />
                </Box>

                {/* Row 2 */}
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    required
                    label="STUDENT NAME*"
                    value={formData.studentName}
                    onChange={(e) => handleChange('studentName', e.target.value)}
                    placeholder="Student Name"
                    sx={fieldSx}
                  />
                </Box>
                
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    required
                    label="FATHER NAME*"
                    value={formData.fatherName}
                    onChange={(e) => handleChange('fatherName', e.target.value)}
                    placeholder="Father Name"
                    sx={fieldSx}
                  />
                </Box>
                
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    required
                    label="DATE OF BIRTH*"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                  />
                </Box>

                {/* Row 3 */}
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    label="ROLL NUMBER"
                    value={formData.rollNumber}
                    onChange={(e) => handleChange('rollNumber', e.target.value)}
                    placeholder="Roll Number"
                    sx={fieldSx}
                    helperText="Auto-generated (editable)"
                  />
                </Box>
                
                <Box sx={gridColSx}>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>RELIGION*</InputLabel>
                    <Select
                      fullWidth
                      value={formData.religion}
                      onChange={(e) => handleChange('religion', e.target.value)}
                      label="RELIGION*"
                      sx={selectSx}
                    >
                      {religions.map((rel) => (
                        <MenuItem key={rel} value={rel}>
                          {rel}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={gridColSx}>
                  <FormControl fullWidth required sx={fieldSx}>
                    <InputLabel>GENDER*</InputLabel>
                    <Select
                      fullWidth
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      label="GENDER*"
                      sx={selectSx}
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Row 4 */}
                <Box sx={gridColSx}>
                  <TextField
                    fullWidth
                    required
                    label="ADM EFFCT NO*"
                    type="date"
                    value={formData.admEffectNo}
                    onChange={(e) => handleChange('admEffectNo', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                  />
                </Box>
                
                <Box sx={gridColSx}>
                  <Box sx={checkboxBoxSx}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.markAsEnrolled}
                          onChange={(e) => handleChange('markAsEnrolled', e.target.checked)}
                          sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }}
                        />
                      }
                      label="MARK AS ENROLLED"
                      sx={{ m: 0, width: '100%', '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 600, color: '#475569' } }}
                    />
                  </Box>
                </Box>

                <Box sx={gridColSx}>
                  <Box>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      sx={uploadButtonSx}
                    >
                      {formData.studentPicture ? 'Change Picture' : 'Upload Picture'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </Button>
                    {formData.studentPicture && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'success.main',
                          display: 'block',
                          mt: 0.5,
                          fontWeight: 500,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✓ {formData.studentPicture.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
              </Box>
            </Box>

            {/* ADDRESS Section */}
            <Box 
              sx={{ 
                mb: 4,
                p: { xs: 2, sm: 2.5, md: 3 },
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LocationOn sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    Address Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Present and permanent address details
                  </Typography>
                </Box>
              </Box>
              
              <Tabs 
                value={addressTab} 
                onChange={(e, newValue) => setAddressTab(newValue)} 
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ 
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .Mui-selected': {
                    color: 'success.main',
                  },
                }}
                TabIndicatorProps={{
                  sx: { bgcolor: 'success.main', height: 3 }
                }}
              >
                <Tab icon={<Home />} iconPosition="start" label="Present Address" />
                <Tab icon={<Home />} iconPosition="start" label="Permanent Address" />
              </Tabs>
              
              {addressTab === 0 && (
                <Box sx={formGridSx}>
                  <Box sx={fullWidthColSx}>
                    <TextField
                      fullWidth
                      label="STUDENT ADDRESS"
                      value={formData.presentAddress.address}
                      onChange={(e) => handleNestedChange('presentAddress', 'address', e.target.value)}
                      placeholder="House no, Street, Colony, City"
                      sx={fieldSx}
                    />
                  </Box>

                  {/* CITY DROPDOWN FIRST */}
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>CITY</InputLabel>
                      <Select
                        fullWidth
                        value={formData.presentAddress.city}
                        onChange={(e) => handleNestedChange('presentAddress', 'city', e.target.value)}
                        label="CITY"
                        sx={selectSx}
                      >
                        {cities.map((city) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* CUSTOM CITY FIELD IF OTHER */}
                  {formData.presentAddress.city === 'Other' && (
                    <Box sx={gridColSx}>
                      <TextField
                        fullWidth
                        required
                        label="ENTER CITY NAME*"
                        value={formData.presentAddress.customCity}
                        onChange={(e) => handleNestedChange('presentAddress', 'customCity', e.target.value)}
                        placeholder="Enter City Name"
                        sx={fieldSx}
                      />
                    </Box>
                  )}

                  {/* COUNTRY DROPDOWN AFTER CITY */}
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>COUNTRY</InputLabel>
                      <Select
                        fullWidth
                        value={formData.presentAddress.country}
                        onChange={(e) => handleNestedChange('presentAddress', 'country', e.target.value)}
                        label="COUNTRY"
                        sx={selectSx}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country} value={country}>
                            {country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* CUSTOM COUNTRY FIELD IF OTHER */}
                  {formData.presentAddress.country === 'Other' && (
                    <Box sx={gridColSx}>
                      <TextField
                        fullWidth
                        required
                        label="ENTER COUNTRY NAME*"
                        value={formData.presentAddress.customCountry}
                        onChange={(e) => handleNestedChange('presentAddress', 'customCountry', e.target.value)}
                        placeholder="Enter Country Name"
                        sx={fieldSx}
                      />
                    </Box>
                  )}
                </Box>
              )}
              
              {addressTab === 1 && (
                <Box sx={formGridSx}>
                  <Box sx={fullWidthColSx}>
                    <TextField
                      fullWidth
                      label="STUDENT ADDRESS"
                      value={formData.permanentAddress.address}
                      onChange={(e) => handleNestedChange('permanentAddress', 'address', e.target.value)}
                      placeholder="House no, Street, Colony, City"
                      sx={fieldSx}
                    />
                  </Box>

                  {/* CITY DROPDOWN FIRST */}
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>CITY</InputLabel>
                      <Select
                        fullWidth
                        value={formData.permanentAddress.city}
                        onChange={(e) => handleNestedChange('permanentAddress', 'city', e.target.value)}
                        label="CITY"
                        sx={selectSx}
                      >
                        {cities.map((city) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* CUSTOM CITY FIELD IF OTHER */}
                  {formData.permanentAddress.city === 'Other' && (
                    <Box sx={gridColSx}>
                      <TextField
                        fullWidth
                        required
                        label="ENTER CITY NAME*"
                        value={formData.permanentAddress.customCity}
                        onChange={(e) => handleNestedChange('permanentAddress', 'customCity', e.target.value)}
                        placeholder="Enter City Name"
                        sx={fieldSx}
                      />
                    </Box>
                  )}

                  {/* COUNTRY DROPDOWN AFTER CITY */}
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>COUNTRY</InputLabel>
                      <Select
                        fullWidth
                        value={formData.permanentAddress.country}
                        onChange={(e) => handleNestedChange('permanentAddress', 'country', e.target.value)}
                        label="COUNTRY"
                        sx={selectSx}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country} value={country}>
                            {country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* CUSTOM COUNTRY FIELD IF OTHER */}
                  {formData.permanentAddress.country === 'Other' && (
                    <Box sx={gridColSx}>
                      <TextField
                        fullWidth
                        required
                        label="ENTER COUNTRY NAME*"
                        value={formData.permanentAddress.customCountry}
                        onChange={(e) => handleNestedChange('permanentAddress', 'customCountry', e.target.value)}
                        placeholder="Enter Country Name"
                        sx={fieldSx}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* GUARDIAN Section */}
            <Box 
              sx={{ 
                mb: 4,
                p: { xs: 2, sm: 2.5, md: 3 },
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'warning.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FamilyRestroom sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    Guardian Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Father, mother, and guardian contact details
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                {/* Father Details Sub-section */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#495057', mb: 2, borderBottom: '1px solid #dee2e6', pb: 1 }}>
                  Father's Details
                </Typography>
                <Box sx={{ ...formGridSx, mb: 4 }}>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="FATHER NAME"
                      value={formData.father.name}
                      onChange={(e) => handleNestedChange('father', 'name', e.target.value)}
                      placeholder="Father Name"
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="FATHER MOBILE"
                      value={formData.father.mobileNumber}
                      onChange={(e) => handleNestedChange('father', 'mobileNumber', e.target.value)}
                      placeholder="e.g: 923001234567"
                      error={formData.father.mobileNumber && !validatePhone(formData.father.mobileNumber)}
                      helperText={formData.father.mobileNumber && !validatePhone(formData.father.mobileNumber) ? 'Invalid phone number (min 10 digits)' : ''}
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>FATHER OPERATOR</InputLabel>
                      <Select
                        fullWidth
                        value={formData.father.mobileOperator}
                        onChange={(e) => handleNestedChange('father', 'mobileOperator', e.target.value)}
                        label="FATHER OPERATOR"
                        sx={selectSx}
                      >
                        {mobileOperators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Guardian Details Sub-section */}
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#495057', mb: 2, borderBottom: '1px solid #dee2e6', pb: 1 }}>
                  Guardian's Details (Optional)
                </Typography>
                <Box sx={formGridSx}>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="GUARDIAN NAME"
                      value={formData.guardian.name}
                      onChange={(e) => handleNestedChange('guardian', 'name', e.target.value)}
                      placeholder="Guardian Name"
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="RELATION"
                      value={formData.guardian.relation}
                      onChange={(e) => handleNestedChange('guardian', 'relation', e.target.value)}
                      placeholder="Relation"
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="GUARDIAN CNIC"
                      value={formData.guardian.cnic}
                      onChange={(e) => handleNestedChange('guardian', 'cnic', e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      inputProps={{ maxLength: 15 }}
                      error={formData.guardian.cnic && !validateCNIC(formData.guardian.cnic)}
                      helperText={formData.guardian.cnic && !validateCNIC(formData.guardian.cnic) ? 'CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)' : ''}
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <TextField
                      fullWidth
                      label="MOBILE NUMBER"
                      value={formData.guardian.mobileNumber}
                      onChange={(e) => handleNestedChange('guardian', 'mobileNumber', e.target.value)}
                      placeholder="e.g: 923001234567"
                      error={formData.guardian.mobileNumber && !validatePhone(formData.guardian.mobileNumber)}
                      helperText={formData.guardian.mobileNumber && !validatePhone(formData.guardian.mobileNumber) ? 'Invalid phone number (min 10 digits)' : ''}
                      sx={fieldSx}
                    />
                  </Box>
                  <Box sx={gridColSx}>
                    <FormControl fullWidth sx={fieldSx}>
                      <InputLabel>MOBILE OPERATOR</InputLabel>
                      <Select
                        fullWidth
                        value={formData.guardian.mobileOperator}
                        onChange={(e) => handleNestedChange('guardian', 'mobileOperator', e.target.value)}
                        label="MOBILE OPERATOR"
                        sx={selectSx}
                      >
                        {mobileOperators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Save Button */}
            <Box 
              display="flex" 
              flexDirection={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'stretch', sm: 'center' }}
              gap={2}
              mt={4}
              pt={3}
              sx={{ 
                borderTop: '2px solid #e9ecef',
              }}
            >
              <Box sx={{ mb: { xs: 1, sm: 0 } }}>
                <Typography variant="body2" sx={{ color: '#6c757d', mb: 0.5 }}>
                  <Info sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  Please review all information before submitting
                </Typography>
                <Typography variant="caption" sx={{ color: '#adb5bd' }}>
                  Fields marked with * are required
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={loading}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  px: 5,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Admission' : 'Submit Admission'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Add Class Dialog */}
      <Dialog open={classDialogOpen} onClose={() => setClassDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Class</Typography>
            <IconButton onClick={() => setClassDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Class Name"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Class Code"
                value={newClass.code}
                onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddClass} variant="contained">Add Class</Button>
        </DialogActions>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Section</Typography>
            <IconButton onClick={() => setSectionDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Section Name"
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Section Code"
                value={newSection.code}
                onChange={(e) => setNewSection({ ...newSection, code: e.target.value.toUpperCase() })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained" disabled={!formData.class}>Add Section</Button>
        </DialogActions>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Group</Typography>
            <IconButton onClick={() => setGroupDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Group Name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddGroup} variant="contained">Add Group</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdmissionForm;
