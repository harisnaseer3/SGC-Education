# PaginatedTable Component

A reusable React component that automatically applies pagination to any data table.

## Features

- ✅ Automatic pagination (default: 12 rows per page)
- ✅ Configurable page size (12, 25, 50, 100)
- ✅ Easy to use - just pass data and columns
- ✅ Customizable row rendering
- ✅ Automatic pagination reset when data changes
- ✅ Built-in empty state handling

## Usage

### Basic Example

```jsx
import PaginatedTable from '../components/common/PaginatedTable';

const MyComponent = () => {
  const data = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
    // ... more data
  ];

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
  ];

  return <PaginatedTable data={data} columns={columns} />;
};
```

### Advanced Example with Custom Rendering

```jsx
import PaginatedTable from '../components/common/PaginatedTable';
import { Chip } from '@mui/material';

const MyComponent = () => {
  const data = [
    { id: 1, name: 'John', status: 'active' },
    // ... more data
  ];

  const columns = [
    { id: 'name', label: 'Name' },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.status}
          color={row.status === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
  ];

  return (
    <PaginatedTable
      data={data}
      columns={columns}
      defaultRowsPerPage={25}
      onRowClick={(row) => console.log('Clicked:', row)}
      emptyMessage="No users found"
    />
  );
};
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | `[]` | Array of data objects to display |
| `columns` | Array | `[]` | Column definitions (see below) |
| `defaultRowsPerPage` | number | `12` | Default number of rows per page |
| `rowsPerPageOptions` | Array | `[12, 25, 50, 100]` | Available page size options |
| `onRowClick` | Function | `undefined` | Callback when a row is clicked |
| `emptyMessage` | string | `'No data found'` | Message to show when data is empty |
| `tableProps` | Object | `{}` | Additional props for Table component |
| `containerProps` | Object | `{}` | Additional props for TableContainer component |
| `getRowKey` | Function | `(row, index) => row._id \|\| row.id \|\| index` | Function to get unique key for each row |
| `renderRow` | Function | `undefined` | Custom row renderer function |

## Column Definition

Each column in the `columns` array can have:

```javascript
{
  id: 'fieldName',           // Required: field name in data object
  label: 'Column Label',     // Required: column header text
  align: 'left',             // Optional: 'left' | 'center' | 'right'
  render: (row, index) => {}, // Optional: custom cell renderer
  headerSx: {},               // Optional: MUI sx props for header cell
  cellSx: {},                // Optional: MUI sx props for data cell
}
```

## Best Practices

1. **Always use PaginatedTable for new tables** - Don't create tables without pagination
2. **Use meaningful column IDs** - Match the field names in your data objects
3. **Provide custom renderers for complex data** - Use the `render` function for chips, buttons, etc.
4. **Set appropriate default page size** - Use 12 for most tables, 25 for larger datasets

## Migration Guide

To migrate an existing table to use PaginatedTable:

1. Import the component
2. Define your columns array
3. Replace your TableContainer/Table structure with `<PaginatedTable />`
4. Remove manual pagination code

Example:

**Before:**
```jsx
<TableContainer>
  <Table>
    <TableHead>...</TableHead>
    <TableBody>
      {data.map(row => <TableRow>...</TableRow>)}
    </TableBody>
  </Table>
</TableContainer>
```

**After:**
```jsx
<PaginatedTable
  data={data}
  columns={columns}
/>
```
