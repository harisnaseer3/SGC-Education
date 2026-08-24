/**
 * API Configuration
 * 
 * This file centralizes API base URL configuration.
 * For production, set REACT_APP_API_URL in .env.production
 * For development, it defaults to http://localhost:5000/api/v1
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

/**
 * Get the full API URL for an endpoint
 * @param {string} endpoint - API endpoint (e.g., '/users', '/dashboard/stats')
 * @returns {string} Full API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Get the base API URL
 * @returns {string} Base API URL
 */
export const getApiBaseUrl = () => API_BASE_URL;

/**
 * Get full accessible URL for a logo or uploaded static image.
 * If path starts with data: or blob:, returns path as is.
 * If institutionId is provided, uses the dedicated API endpoint (/institutions/:id/logo-image)
 * which bypasses Nginx static asset regex rules on live servers.
 * Otherwise resolves logoPath relative to API_BASE_URL.
 * @param {string} logoPath
 * @param {string} [institutionId]
 * @returns {string|null}
 */
export const getLogoUrl = (logoPath, institutionId) => {
  if (!logoPath && !institutionId) return null;
  if (
    logoPath && (
      logoPath.startsWith('data:') ||
      logoPath.startsWith('blob:')
    )
  ) {
    return logoPath;
  }
  if (institutionId) {
    return getApiUrl(`institutions/${institutionId}/logo-image`);
  }
  if (logoPath && (logoPath.startsWith('http://') || logoPath.startsWith('https://'))) {
    return logoPath;
  }
  return logoPath ? getApiUrl(logoPath) : null;
};

export default API_BASE_URL;
