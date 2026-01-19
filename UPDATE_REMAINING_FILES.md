# Remaining Files to Update

The following files still have hardcoded `localhost:5000` URLs and need to be updated to use `getApiUrl` from `../config/api`:

## Pages (14 files)
1. `client/src/pages/AdmissionForm.js`
2. `client/src/pages/FeeManagement.js` (has `API_URL` constant)
3. `client/src/pages/InstitutionForm.js`
4. `client/src/pages/ClassForm.js`
5. `client/src/pages/GroupForm.js`
6. `client/src/pages/SectionForm.js`
7. `client/src/pages/UserForm.js`
8. `client/src/pages/Settings.js` (has `API_URL` constant)
9. `client/src/pages/Reports.js` (has `API_URL` constant)
10. `client/src/pages/Performance.js` (has `API_URL` constant)
11. `client/src/pages/Messages.js` (has `API_URL` constant)
12. `client/src/pages/Calendar.js` (has `API_URL` constant)

## Components (3 files)
1. `client/src/components/InstitutionSwitcher.js` (already uses `process.env.REACT_APP_API_URL` but should use `getApiUrl` for consistency)
2. `client/src/components/reports/AdmissionByDateReport.js`
3. `client/src/components/reports/AdmissionByMonthReport.js`

## Update Pattern

For each file:

1. **Add import:**
   ```javascript
   import { getApiUrl } from '../config/api';
   // or for components:
   import { getApiUrl } from '../../config/api';
   ```

2. **Replace hardcoded URLs:**
   ```javascript
   // Before
   const response = await axios.get('http://localhost:5000/api/v1/endpoint', {...});
   
   // After
   const response = await axios.get(getApiUrl('endpoint'), {...});
   ```

3. **For files with API_URL constant:**
   ```javascript
   // Remove this line:
   const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
   
   // Replace all `${API_URL}/...` with `getApiUrl('...')`
   ```

## Quick Update Script

You can use this pattern to update remaining files:

```bash
# For each file, replace:
# 'http://localhost:5000/api/v1/endpoint' → getApiUrl('endpoint')
# `${API_URL}/endpoint` → getApiUrl('endpoint')
```
