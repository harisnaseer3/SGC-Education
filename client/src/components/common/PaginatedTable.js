import React from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
} from '@mui/material';
import { useTablePagination } from '../../hooks/useTablePagination';

/**
 * Reusable PaginatedTable component
 * Automatically applies pagination to any table
 * 
 * @param {Array} data - Array of data to display
 * @param {Array} columns - Array of column definitions: [{ id, label, align, render }]
 * @param {number} defaultRowsPerPage - Default rows per page (default: 12)
 * @param {Array} rowsPerPageOptions - Available rows per page options (default: [12, 25, 50, 100])
 * @param {Function} onRowClick - Optional callback when a row is clicked
 * @param {string} emptyMessage - Message to show when no data (default: 'No data found')
 * @param {Object} tableProps - Additional props to pass to Table component
 * @param {Object} containerProps - Additional props to pass to TableContainer component
 * @param {Function} getRowKey - Function to get unique key for each row (default: (row, index) => row._id || index)
 * @param {Function} renderRow - Optional custom row renderer function
 */
const PaginatedTable = ({
  data = [],
  columns = [],
  defaultRowsPerPage = 12,
  rowsPerPageOptions = [12, 25, 50, 100],
  onRowClick,
  emptyMessage = 'No data found',
  tableProps = {},
  containerProps = {},
  getRowKey = (row, index) => row._id || row.id || index,
  renderRow,
  ...otherProps
}) => {
  const pagination = useTablePagination(defaultRowsPerPage, rowsPerPageOptions);
  const paginatedData = pagination.getPaginatedData(data);

  // Reset pagination when data changes
  React.useEffect(() => {
    pagination.resetPagination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  if (!Array.isArray(data)) {
    console.warn('PaginatedTable: data must be an array');
    return null;
  }

  return (
    <TableContainer component={Paper} {...containerProps}>
      <Table {...tableProps}>
        {columns.length > 0 && (
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={column.headerSx || {}}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length || 1} align="center" sx={{ py: 4 }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => {
              const actualIndex = pagination.page * pagination.rowsPerPage + index;
              const rowKey = getRowKey(row, actualIndex);

              if (renderRow) {
                return renderRow(row, actualIndex, rowKey);
              }

              return (
                <TableRow
                  key={rowKey}
                  hover={!!onRowClick}
                  onClick={onRowClick ? () => onRowClick(row, actualIndex) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    ...(row.rowSx || {}),
                  }}
                >
                  {columns.map((column) => {
                    const cellValue = column.render
                      ? column.render(row, actualIndex)
                      : row[column.id] || '';

                    return (
                      <TableCell
                        key={column.id}
                        align={column.align || 'left'}
                        sx={column.cellSx || {}}
                      >
                        {cellValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {data.length > 0 && (
        <TablePagination
          component="div"
          count={data.length}
          page={pagination.page}
          onPageChange={pagination.handleChangePage}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.handleChangeRowsPerPage}
          rowsPerPageOptions={pagination.rowsPerPageOptions}
          labelRowsPerPage="Rows per page:"
        />
      )}
    </TableContainer>
  );
};

export default PaginatedTable;
