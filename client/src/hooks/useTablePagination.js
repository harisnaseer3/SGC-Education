import { useState, useCallback } from 'react';

/**
 * Custom hook for table pagination
 * Provides pagination state and helper functions for any table
 * 
 * @param {number} defaultRowsPerPage - Default number of rows per page (default: 12)
 * @param {Array} rowsPerPageOptions - Available rows per page options (default: [12, 25, 50, 100])
 * @returns {Object} Pagination state and handlers
 */
export const useTablePagination = (defaultRowsPerPage = 12, rowsPerPageOptions = [12, 25, 50, 100]) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing page size
  }, []);

  const getPaginatedData = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  }, [page, rowsPerPage]);

  const resetPagination = useCallback(() => {
    setPage(0);
  }, []);

  return {
    page,
    rowsPerPage,
    rowsPerPageOptions,
    handleChangePage,
    handleChangeRowsPerPage,
    getPaginatedData,
    resetPagination,
    totalCount: 0 // Will be set by the component using the hook
  };
};
