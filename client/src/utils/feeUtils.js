import * as XLSXStyle from 'xlsx-js-style';

/**
 * Fee Management Utility Functions
 * Centralized utilities to eliminate duplicate code in FeeManagement component
 */

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get institution ID from user context
 * @param {Object} user - Current user object
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {string|null} Institution ID
 */
export const getInstitutionId = (user, isSuperAdmin) => {
  // For admin users, always use their institution
  if (!isSuperAdmin && user.institution) {
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  }
  // For super admin, get from localStorage
  if (isSuperAdmin) {
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData) {
      try {
        const institution = JSON.parse(institutionData);
        return institution._id || institution;
      } catch (e) {
        // If it's not JSON, it might be a string ID
        return institutionData;
      }
    }
  }
  return null;
};

/**
 * Parse month/year string to month and year numbers
 * Handles both "YYYY-MM" and "M-YYYY" formats
 * @param {string} monthYear - Month/year string
 * @returns {{month: number, year: number}} Parsed month and year
 */
export const parseMonthYear = (monthYear) => {
  if (!monthYear) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  const parts = monthYear.split('-');
  if (parts.length !== 2) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  // Check if first part is 4 digits (YYYY-MM format)
  if (parts[0].length === 4) {
    return {
      month: parseInt(parts[1], 10),
      year: parseInt(parts[0], 10)
    };
  } else {
    // M-YYYY format
    return {
      month: parseInt(parts[0], 10),
      year: parseInt(parts[1], 10)
    };
  }
};

/**
 * Format month/year for display
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year number
 * @returns {string} Formatted string (e.g., "Jan 2024")
 */
export const formatMonthYear = (month, year) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[(month || 1) - 1] || month} ${year}`;
};

/**
 * Calculate academic year from month/year
 * @param {number} month - Month number
 * @param {number} year - Year number
 * @returns {string} Academic year string (e.g., "2024-2025")
 */
export const calculateAcademicYear = (month, year) => {
  // Academic year typically starts in April (month 4)
  // If month is before April, academic year is previous year-current year
  // If month is April or after, academic year is current year-next year
  if (month < 4) {
    return `${year - 1}-${year}`;
  } else {
    return `${year}-${year + 1}`;
  }
};

/**
 * Extract student name from admission or student object
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Student name or 'N/A'
 */
export const getStudentName = (admission, student) => {
  if (admission?.personalInfo?.name) return admission.personalInfo.name;
  if (student?.personalDetails?.name) return student.personalDetails.name;
  if (student?.name) return student.name;
  if (student?.user?.name) return student.user.name;
  
  if (admission?.personalInfo?.firstName) {
    const lastName = admission.personalInfo.lastName || '';
    return `${admission.personalInfo.firstName} ${lastName}`.trim();
  }
  
  if (student?.firstName || student?.personalDetails?.firstName) {
    const fName = student.firstName || student.personalDetails?.firstName;
    const lName = student.lastName || student.personalDetails?.lastName || '';
    return `${fName} ${lName}`.trim();
  }

  return 'N/A';
};

/**
 * Extract student ID from various sources
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Student ID or 'N/A'
 */
export const getStudentId = (admission, student) => {
  return student?.enrollmentNumber || 
         student?.rollNumber || 
         admission?.applicationNumber || 
         student?.applicationNumber ||
         student?.admissionNo ||
         student?.admissionNumber ||
         admission?.studentId?.enrollmentNumber || 
         'N/A';
};

/**
 * Extract roll number from various sources
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Roll number or 'N/A'
 */
export const getRollNumber = (admission, student) => {
  return admission?.rollNumber || 
         student?.rollNumber || 
         admission?.studentId?.rollNumber || 
         'N/A';
};

/**
 * Transform student/admission data to consistent format
 * @param {Object} data - Admission or student data
 * @param {Object} options - Transformation options
 * @returns {Object} Transformed student data
 */
export const transformStudentData = (data, options = {}) => {
  const admission = data.admission || data;
  const student = data.student || admission?.studentId;
  
  return {
    _id: admission?._id || student?._id || data._id,
    studentId: student?._id || student || admission?.studentId?._id || admission?.studentId,
    id: getStudentId(admission, student),
    rollNumber: getRollNumber(admission, student),
    name: getStudentName(admission, student),
    fatherName: admission?.guardianInfo?.fatherName || admission?.personalInfo?.fatherName || 'N/A',
    class: admission?.class?.name || student?.class?.name || 'N/A',
    section: admission?.section?.name || student?.section?.name || 'N/A',
    status: student?.status || admission?.status || 'pending',
    admissionNo: admission?.applicationNumber || 'N/A',
    admissionDate: admission?.admissionDate 
      ? new Date(admission.admissionDate).toLocaleDateString() 
      : (admission?.createdAt ? new Date(admission.createdAt).toLocaleDateString() : 'N/A'),
    mobileNumber: admission?.contactInfo?.phone || 
                  admission?.contactInfo?.mobileNumber || 
                  admission?.personalInfo?.phone || 
                  'N/A',
    ...options.additionalFields
  };
};

/**
 * Create axios request config with auth token
 * @param {Object} options - Request options
 * @returns {Object} Axios config object
 */
export const createAxiosConfig = (options = {}) => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  };
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US'
  } = options;
  
  return `Rs. ${(amount || 0).toLocaleString(locale, { 
    minimumFractionDigits, 
    maximumFractionDigits 
  })}`;
};

/**
 * Validate voucher number format
 * @param {string} voucherNumber - Voucher number to validate
 * @returns {boolean} True if valid format
 */
export const isValidVoucherNumber = (voucherNumber) => {
  if (!voucherNumber) return false;
  // Format: VCH-YYYY-MM-SEQ or RCP-YYYY-SEQ
  const patterns = [
    /^VCH-\d{4}-\d{2}-\d{6}$/,
    /^RCP-\d{4}-\d{6}$/,
    /^\d{5,}$/
  ];
  return patterns.some(pattern => pattern.test(voucherNumber));
};

/**
 * Compare voucher month/year
 * @param {Object} voucher - Voucher object
 * @param {number} month - Month to compare
 * @param {number} year - Year to compare
 * @returns {boolean} True if voucher matches month/year
 */
export const matchesVoucherMonthYear = (voucher, month, year) => {
  if (!voucher || voucher.month === undefined || voucher.year === undefined) {
    return false;
  }
  const vMonth = typeof voucher.month === 'string' ? parseInt(voucher.month, 10) : Number(voucher.month);
  const vYear = typeof voucher.year === 'string' ? parseInt(voucher.year, 10) : Number(voucher.year);
  return vMonth === Number(month) && vYear === Number(year);
};

/**
 * Export data array to Excel with bold headers and auto-fitted column widths
 * @param {Object} XLSXLib - XLSX module reference
 * @param {Array<Object>} exportData - Array of objects to export
 * @param {string} sheetName - Worksheet tab name
 * @param {string} fileName - File name to save (.xlsx)
 */
export const exportToExcelWithBoldHeaders = (originalXlsxLib, exportData, sheetName, fileName, customHeaderInfo = null) => {
  const XLSXLib = XLSXStyle;
  if (!exportData || exportData.length === 0) return;

  // Retrieve generic institution data for header
  const getInstitutionData = () => {
    try {
      const data = localStorage.getItem('selectedInstitution');
      if (data) return JSON.parse(data);
    } catch(e) {}
    return null;
  };

  const inst = getInstitutionData();
  const instName = inst?.name || 'SGC Education System';
  const instCity = inst?.address?.city || '';
  const printDate = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

  let headerRows = [];
  if (Array.isArray(customHeaderInfo)) {
    headerRows = customHeaderInfo;
  } else {
    headerRows.push([instName]);
    if (instCity) headerRows.push([instCity]);
    headerRows.push([sheetName]); 
    headerRows.push([]); // spacer

    if (customHeaderInfo && typeof customHeaderInfo === 'object') {
      const filterLabels = Object.entries(customHeaderInfo).map(([key, value]) => `${key}: ${value}`);
      if (filterLabels.length > 0) {
        headerRows.push([filterLabels.join('      ')]);
      }
    }
    
    headerRows.push([`Print Date: ${printDate}`]);
    headerRows.push([]); // spacer
  }

  const dataStartRow = headerRows.length;
  const originRow = XLSXLib.utils.encode_cell({ r: dataStartRow, c: 0 });
  const ws = XLSXLib.utils.json_to_sheet(exportData, { origin: originRow });

  if (headerRows.length > 0) {
    XLSXLib.utils.sheet_add_aoa(ws, headerRows, { origin: "A1" });
  }

  const headers = Object.keys(exportData[0] || {});

  // Set column widths so header and data cells fit cleanly
  ws['!cols'] = headers.map(h => ({
    wch: Math.max(h.toString().length + 5, 14)
  }));

  // Apply merging and styling to the top corporate headers
  if (!ws['!merges']) ws['!merges'] = [];
  for (let i = 0; i < headerRows.length; i++) {
    // Only merge rows that have exactly 1 item in the array to ensure we don't merge rows meant to have separate columns
    if (headerRows[i] && headerRows[i].length === 1 && headerRows[i][0]) {
      ws['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: Math.max(headers.length - 1, 0) } });
      
      const cellRef = XLSXLib.utils.encode_cell({ r: i, c: 0 });
      if (ws[cellRef]) {
        let fontSize = 11;
        let isBold = false;
        
        // Differentiate style levels if it's the standard auto-generated corporate block
        if (!Array.isArray(customHeaderInfo)) {
          if (i === 0) { fontSize = 16; isBold = true; } // Institution Name
          else if (i === 1) { fontSize = 13; isBold = false; } // City
          else if (i === 2) { fontSize = 15; isBold = true; } // Report Name
        } else {
          isBold = true; 
          fontSize = 12;
        }

        ws[cellRef].s = {
          font: { bold: isBold, sz: fontSize, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }
  }

  // Style the column headers of the data block
  headers.forEach((_, colIndex) => {
    const cellRef = XLSXLib.utils.encode_cell({ r: dataStartRow, c: colIndex });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, sz: 12, name: 'Calibri' },
        fill: { fgColor: { rgb: 'E2E8F0' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  });

  const wb = XLSXLib.utils.book_new();
  XLSXLib.utils.book_append_sheet(wb, ws, sheetName);
  XLSXLib.writeFile(wb, fileName, { cellStyles: true });
};


