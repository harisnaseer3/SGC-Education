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

export default API_BASE_URL;
