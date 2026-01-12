# Pagination Implementation Guide

## ✅ Completed

Pagination has been successfully implemented across the application with the following features:

- **Default page size**: 12 rows per page
- **Configurable page size**: Users can select 12, 25, 50, or 100 rows per page
- **Applied to all existing tables** in:
  - ✅ FeeManagement.js (all 9 tables)
  - ✅ Admissions.js (all 4 main tables)

## 📦 Reusable Components Created

### 1. `useTablePagination` Hook
**Location**: `client/src/hooks/useTablePagination.js`

A custom React hook that manages pagination state and provides helper functions.

**Usage:**
```jsx
import { useTablePagination } from '../hooks/useTablePagination';

const MyComponent = () => {
  const pagination = useTablePagination(12); // default 12 rows per page
  
  const paginatedData = pagination.getPaginatedData(myDataArray);
  
  return (
    <>
      <Table>
        <TableBody>
          {paginatedData.map(item => <TableRow>...</TableRow>)}
        </TableBody>
      </Table>
      <TablePagination
        count={myDataArray.length}
        page={pagination.page}
        onPageChange={pagination.handleChangePage}
        rowsPerPage={pagination.rowsPerPage}
        onRowsPerPageChange={pagination.handleChangeRowsPerPage}
        rowsPerPageOptions={pagination.rowsPerPageOptions}
      />
    </>
  );
};
```

### 2. `PaginatedTable` Component
**Location**: `client/src/components/common/PaginatedTable.js`

A complete, ready-to-use table component with built-in pagination.

**Usage:**
```jsx
import PaginatedTable from '../components/common/PaginatedTable';

const MyComponent = () => {
  const data = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ];

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
  ];

  return <PaginatedTable data={data} columns={columns} />;
};
```

**See**: `client/src/components/common/PaginatedTable.md` for full documentation.

## 🚀 For Future Tables

### Option 1: Use PaginatedTable Component (Recommended)

**For new tables, always use the `PaginatedTable` component:**

```jsx
import PaginatedTable from '../components/common/PaginatedTable';

// Define your columns
const columns = [
  { id: 'name', label: 'Name' },
  { 
    id: 'status', 
    label: 'Status',
    render: (row) => <Chip label={row.status} />
  },
];

// Use it
<PaginatedTable 
  data={myData} 
  columns={columns}
  defaultRowsPerPage={12}
/>
```

**Benefits:**
- ✅ Automatic pagination
- ✅ Less code to write
- ✅ Consistent UI/UX
- ✅ Built-in empty state handling

### Option 2: Use useTablePagination Hook

**If you need more control over the table structure:**

```jsx
import { useTablePagination } from '../hooks/useTablePagination';
import { TablePagination } from '@mui/material';

const MyComponent = () => {
  const pagination = useTablePagination(12);
  
  // Get paginated data
  const paginatedData = pagination.getPaginatedData(myDataArray);
  
  return (
    <>
      <TableContainer>
        <Table>
          {/* Your table structure */}
          <TableBody>
            {paginatedData.map(item => (
              <TableRow key={item.id}>
                {/* Your cells */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={myDataArray.length}
          page={pagination.page}
          onPageChange={pagination.handleChangePage}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.handleChangeRowsPerPage}
          rowsPerPageOptions={pagination.rowsPerPageOptions}
          labelRowsPerPage="Rows per page:"
        />
      </TableContainer>
    </>
  );
};
```

## 📋 Checklist for New Tables

When creating a new table, ensure:

- [ ] Use `PaginatedTable` component OR `useTablePagination` hook
- [ ] Default page size is 12 rows per page
- [ ] Page size options include: 12, 25, 50, 100
- [ ] Pagination resets when filters/search changes
- [ ] Table shows "No data found" message when empty

## 🔄 Resetting Pagination

When filters or search terms change, reset pagination:

```jsx
import { useEffect } from 'react';

const pagination = useTablePagination(12);

// Reset when filters change
useEffect(() => {
  pagination.resetPagination();
}, [filterValue, searchTerm]);
```

## 📝 Examples in Codebase

**See these files for reference:**
- `client/src/pages/FeeManagement.js` - Multiple tables with pagination
- `client/src/pages/Admissions.js` - Multiple tables with pagination
- `client/src/components/common/PaginatedTable.js` - Reusable component

## ⚠️ Important Notes

1. **Never create tables without pagination** - Always use one of the provided solutions
2. **Default page size is 12** - Don't change this unless there's a specific requirement
3. **Always reset pagination** when data filters change
4. **Use PaginatedTable for new tables** - It's the easiest and most maintainable solution

## 🎯 Quick Start Template

```jsx
import React from 'react';
import PaginatedTable from '../components/common/PaginatedTable';

const MyPage = () => {
  const [data, setData] = React.useState([]);

  const columns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
  ];

  return (
    <div>
      <h1>My Data Table</h1>
      <PaginatedTable 
        data={data} 
        columns={columns}
        emptyMessage="No records found"
      />
    </div>
  );
};

export default MyPage;
```

---

**Remember**: Pagination is now automatic for all new tables. Just use `PaginatedTable` or `useTablePagination` hook! 🎉
