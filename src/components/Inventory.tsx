import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  InputAdornment,
  CircularProgress,
  TablePagination
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Upload,
  Download,
  Search,
  Inventory as InventoryIcon,
  DeleteSweep
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { InventoryItem } from '../types';
import { databaseService } from '../services/adaptiveDatabase';
import { ExcelImportService } from '../services/excelImport';
import { useAuth } from '../contexts/AuthContext';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const items = await databaseService.getInventoryItems();
      setInventoryItems(items);
    } catch (err) {
      setError('Error loading inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredItems = inventoryItems.filter(item =>
    item.sub_section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.style_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleAddItem = () => {
    setSelectedItem({
      id: 0,
      sub_section_name: '',
      style_name: '',
      color_name: '',
      size: '',
      item_code: '',
      style: '',
      category: '',
      design: '',
      barcode: '',
      stock_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setEditDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!selectedItem) return;

    // Validate barcode - must be exactly 10 digits
    if (!selectedItem.barcode || !/^\d{10}$/.test(selectedItem.barcode)) {
      setError('Barcode must be exactly 10 digits');
      return;
    }

    // Validate item code - must be exactly 10 digits
    if (!selectedItem.item_code || !/^\d{10}$/.test(selectedItem.item_code)) {
      setError('Item Code must be exactly 10 digits');
      return;
    }

    // Ensure barcode and item_code are the same
    if (selectedItem.barcode !== selectedItem.item_code) {
      setError('Barcode and Item Code must be the same');
      return;
    }

    try {
      if (selectedItem.id === 0) {
        // Adding new item
        await databaseService.createInventoryItem(selectedItem);
        setSuccess('Item added successfully');
      } else {
        // Updating existing item
        await databaseService.updateInventoryItem(selectedItem.id, selectedItem);
        setSuccess('Item updated successfully');
      }
      await loadInventory();
      setEditDialogOpen(false);
      setSelectedItem(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error saving item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await databaseService.deleteInventoryItem(id);
      await loadInventory();
      setSuccess('Item deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error deleting item');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setError('Please select items to delete');
      return;
    }

    try {
      setLoading(true);
      // Delete items one by one
      for (const id of selectedItems) {
        await databaseService.deleteInventoryItem(id);
      }
      await loadInventory();
      setSelectedItems([]);
      setBulkDeleteDialogOpen(false);
      setSuccess(`${selectedItems.length} items deleted successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error deleting items');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter((itemId: number) => itemId !== id));
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const excelData = await ExcelImportService.parseExcelFile(file);
      const inventoryItems = ExcelImportService.convertToInventoryItems(excelData);
      
      await databaseService.bulkInsertInventoryItems(inventoryItems);
      await loadInventory();
      
      setImportDialogOpen(false);
      setSuccess(`Successfully imported ${inventoryItems.length} items`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    ExcelImportService.downloadTemplate();
  };

  const columns: GridColDef[] = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <input
          type="checkbox"
          checked={selectedItems.includes(params.row.id)}
          onChange={(e) => handleSelectItem(params.row.id, e.target.checked)}
          disabled={!isAdmin}
        />
      )
    },
    { field: 'sub_section_name', headerName: 'Sub Section Name', width: 150 },
    { field: 'style_name', headerName: 'Style Name', width: 150 },
    { field: 'category', headerName: 'Category', width: 120 },
    { field: 'color_name', headerName: 'Color', width: 100 },
    { field: 'size', headerName: 'Size', width: 80 },
    { field: 'barcode', headerName: 'Barcode', width: 120 },
    { 
      field: 'stock_quantity', 
      headerName: 'Stock', 
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value < 10 ? 'error' : params.value < 50 ? 'warning' : 'success'}
          size="small"
        />
      )
    },
    { field: 'design', headerName: 'Design', width: 120 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleEditItem(params.row)}
          disabled={!isAdmin}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDeleteItem(params.row.id)}
          disabled={!isAdmin}
        />
      ]
    }
  ];

  if (loading && inventoryItems.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Inventory Management
        </Typography>
        {isAdmin && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadTemplate}
              sx={{ mr: 2 }}
            >
              Download Template
            </Button>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={() => setImportDialogOpen(true)}
              sx={{ mr: 2 }}
            >
              Import Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddItem}
              sx={{ mr: 2 }}
            >
              Add Item
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={selectedItems.length === 0}
            >
              Bulk Delete ({selectedItems.length})
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Inventory Items ({filteredItems.length})
            </Typography>
            <TextField
              placeholder="Search items..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
          </Box>

          {/* Select All Checkbox */}
          {isAdmin && (
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              <Typography variant="body2" color="text.secondary">
                Select All ({selectedItems.length} selected)
              </Typography>
            </Box>
          )}

          <DataGrid
            rows={filteredItems}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 25 },
              },
            }}
            pageSizeOptions={[25, 50, 100]}
            disableRowSelectionOnClick
            autoHeight
            loading={loading}
            sx={{ border: 0 }}
          />
        </CardContent>
      </Card>

      {/* Edit/Add Item Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Code (10 digits)"
                  value={selectedItem.item_code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSelectedItem({...selectedItem, item_code: value, barcode: value});
                  }}
                  inputProps={{ maxLength: 10 }}
                  helperText="Must be exactly 10 digits"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Style Name"
                  value={selectedItem.style_name}
                  onChange={(e) => setSelectedItem({...selectedItem, style_name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={selectedItem.category}
                  onChange={(e) => setSelectedItem({...selectedItem, category: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Color"
                  value={selectedItem.color_name}
                  onChange={(e) => setSelectedItem({...selectedItem, color_name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Size"
                  value={selectedItem.size}
                  onChange={(e) => setSelectedItem({...selectedItem, size: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Barcode (10 digits)"
                  value={selectedItem.barcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSelectedItem({...selectedItem, barcode: value, item_code: value});
                  }}
                  inputProps={{ maxLength: 10 }}
                  helperText="Must be exactly 10 digits"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Design"
                  value={selectedItem.design}
                  onChange={(e) => setSelectedItem({...selectedItem, design: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stock Quantity"
                  type="number"
                  value={selectedItem.stock_quantity}
                  onChange={(e) => setSelectedItem({...selectedItem, stock_quantity: parseInt(e.target.value) || 0})}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Import Inventory from Excel</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an Excel file (.xlsx) with inventory data. Make sure the file has the required columns:
            Sub Section Name, Style_Name, Color Name, Size, Item Code, Style, Category, Design
          </Typography>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            style={{ width: '100%' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Bulk Delete Items</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete {selectedItems.length} selected items?
          </Typography>
          <Typography variant="body2" color="error">
            This action cannot be undone. The following items will be permanently deleted:
          </Typography>
          <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
            {selectedItems.map(id => {
              const item = inventoryItems.find(i => i.id === id);
              return item ? (
                <Typography key={id} variant="body2" sx={{ mb: 0.5 }}>
                  • {item.sub_section_name} - {item.style_name} ({item.item_code}) - {item.category}
                </Typography>
              ) : null;
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkDelete} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : `Delete ${selectedItems.length} Items`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
