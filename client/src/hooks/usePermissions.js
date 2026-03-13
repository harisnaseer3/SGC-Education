import { ROLE_PERMISSIONS } from '../utils/constants';

/**
 * Hook to check if the current user has specific permissions
 * @returns {Object} Helper functions for permission checking
 */
export const usePermissions = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  
  // Dynamic permissions from user object (synced during login/profile refresh)
  // Fallback to static ROLE_PERMISSIONS if user has no permissions array
  const userPermissions = user.permissions || ROLE_PERMISSIONS[userRole] || [];

  /**
   * Check if user has a specific permission
   * @param {string} permission - The permission string to check
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  };

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissions - Array of permission strings
   * @returns {boolean}
   */
  const hasAllPermissions = (permissions) => {
    if (userPermissions.includes('*')) return true;
    return permissions.every(perm => userPermissions.includes(perm));
  };

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissions - Array of permission strings
   * @returns {boolean}
   */
  const hasAnyPermission = (permissions) => {
    if (userPermissions.includes('*')) return true;
    return permissions.some(perm => userPermissions.includes(perm));
  };

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    userRole,
    userPermissions
  };
};

export default usePermissions;
