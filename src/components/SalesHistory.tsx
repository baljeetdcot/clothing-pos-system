import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Search,
  Visibility,
  Download,
  Print,
  FilterList,
  Edit,
  Delete,
  DeleteSweep,
  SelectAll,
  Add,
  Remove
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/adaptiveDatabase';
import { ReceiptService } from '../services/receiptService';
import { PricingService } from '../services/pricing';
import { Sale, SaleItem, InventoryItem } from '../types';

const SalesHistory: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleDetails, setSaleDetails] = useState<SaleItem[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [editFormData, setEditFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_dob: '',
    payment_method: 'cash' as 'cash' | 'online' | 'mixed' | 'pending'
  });
  const [editSaleItems, setEditSaleItems] = useState<SaleItem[]>([]);
  const [editTotals, setEditTotals] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0
  });
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [filteredInventoryItems, setFilteredInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'online' | 'mixed' | 'pending'>('all');

  // Recalculate unit and total prices for all items using PricingService (bundle-aware)
  const repriceItems = async (items: SaleItem[], saleId: number): Promise<SaleItem[]> => {
    // Build cart context from current sale items
    const cartContext = items.map(si => ({
      item: si.inventory_item!,
      quantity: si.quantity,
      unit_price: si.unit_price,
      total_price: si.total_price,
      manual_override: si.manual_override
    }));

    // Compute new prices and persist to DB
    const repriced: SaleItem[] = [];
    for (const si of items) {
      const cartItem = {
        item: si.inventory_item!,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total_price: si.total_price,
        manual_override: si.manual_override
      };
      
      // Calculate new price using PricingService with current cart context
      const computed = PricingService.calculateItemPrice(
        cartItem,
        cartContext,
        [],
        false,
        0,
        0
      );
      
      // Calculate new unit price and total price
      const newUnit = computed / si.quantity;
      const newTotal = computed;

      console.log(`Repricing item ${si.id}:`, {
        category: si.inventory_item?.sub_section_name,
        quantity: si.quantity,
        oldUnit: si.unit_price,
        oldTotal: si.total_price,
        newUnit: newUnit,
        newTotal: newTotal,
        cartQuantity: cartContext.reduce((sum, item) => {
          if (item.item.sub_section_name === si.inventory_item?.sub_section_name) {
            return sum + item.quantity;
          }
          return sum;
        }, 0),
        cartContext: cartContext.map(c => ({
          sub_section: c.item.sub_section_name,
          category: c.item.category,
          quantity: c.quantity
        }))
      });

      // Persist only if changed (avoid extra writes)
      if (Math.abs(newUnit - si.unit_price) > 0.0001 || Math.abs(newTotal - si.total_price) > 0.0001) {
        await databaseService.updateSaleItem(si.id, {
          unit_price: Number(newUnit.toFixed(6)),
          total_price: Number(newTotal.toFixed(6))
        });
      }

      repriced.push({ ...si, unit_price: newUnit, total_price: newTotal });
    }

    // Recalculate and update sale totals using PricingService (keeps discounts consistent)
    const cartItemsForTotal = repriced.map(si => ({
      item: si.inventory_item!,
      quantity: si.quantity,
      unit_price: si.unit_price,
      total_price: si.total_price,
      manual_override: si.manual_override
    }));

    const totals = PricingService.calculateCartTotal(cartItemsForTotal, [], false);

    console.log('Updating sale totals:', {
      saleId,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total
    });

    // Update sale totals in database
    await databaseService.updateSale(saleId, {
      total_amount: totals.subtotal,
      discount_amount: totals.discount,
      tax_amount: totals.tax,
      final_amount: totals.total
    });

    // Update local state
    setEditTotals(prev => ({
      ...prev,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total
    }));

    return repriced;
  };

  useEffect(() => {
    loadSales();
    loadInventoryItems();
  }, []);

  useEffect(() => {
    // Filter inventory items based on search term
    if (inventorySearchTerm.trim() === '') {
      setFilteredInventoryItems(inventoryItems.slice(0, 10)); // Show first 10 items
    } else {
      const filtered = inventoryItems.filter(item => 
        item.barcode?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
        item.style_name?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
        item.color_name?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
        item.size?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
      );
      setFilteredInventoryItems(filtered.slice(0, 10)); // Limit to 10 results
    }
  }, [inventorySearchTerm, inventoryItems]);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError('');
      const salesData = await databaseService.getAllSales();
      setSales(salesData);
    } catch (err) {
      setError('Failed to load sales history');
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const items = await databaseService.getInventoryItems();
      setInventoryItems(items);
    } catch (err) {
      console.error('Error loading inventory items:', err);
    }
  };

  const getItemDisplayPrice = (inventoryItem: InventoryItem): number => {
    // Calculate price using pricing service for display
    const cartItem = {
      item: inventoryItem,
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      manual_override: false
    };
    
    return PricingService.calculateItemPrice(cartItem, [], [], false, 0, 0);
  };

  const loadSaleDetails = async (saleId: string) => {
    try {
      const details = await databaseService.getSaleItems(saleId);
      setSaleDetails(details);
    } catch (err) {
      console.error('Error loading sale details:', err);
    }
  };

  const handleViewDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    await loadSaleDetails(sale.sale_id);
    setDetailsDialogOpen(true);
  };

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      const saleItems = await databaseService.getSaleItems(sale.sale_id);
      const settings = await databaseService.getSettings();
      // Fetch active offers for this customer (offers are now reusable)
      const offers = sale.customer_mobile
        ? await databaseService.getCustomerOffers(sale.customer_mobile)
        : [];
      
      // Convert SaleItems to CartItems for receipt generation
      const cartItems = saleItems.map((item: any) => ({
        item: item.inventory_item!,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        manual_override: item.manual_override
      }));

      // Recompute discount breakdown from offers and infer one-time discount to match saved sale
      const recomputed = PricingService.calculateCartTotal(cartItems, offers, false, 0);
      const inferredOneTimeDiscount = Math.max(0, (sale.discount_amount || 0) - (recomputed.discount || 0));
      await ReceiptService.printReceipt(
        sale,
        cartItems,
        settings,
        user?.username,
        sale.customer_name,
        sale.customer_mobile,
        offers,
        false,
        inferredOneTimeDiscount
      );
    } catch (err) {
      setError('Failed to print receipt');
      console.error('Error printing receipt:', err);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateCSV = () => {
    const headers = ['Sale ID', 'Date', 'Customer', 'Mobile', 'Total Amount', 'Discount', 'Tax', 'Final Amount', 'Payment Method', 'Cashier'];
    const rows = filteredSales.map(sale => [
      sale.sale_id,
      new Date(sale.created_at).toLocaleString(),
      sale.customer_name || '',
      sale.customer_mobile || '',
      sale.total_amount.toFixed(2),
      sale.discount_amount.toFixed(2),
      sale.tax_amount.toFixed(2),
      sale.final_amount.toFixed(2),
      sale.payment_method,
      user?.username || 'Unknown'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const handleEditSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setEditFormData({
      customer_name: sale.customer_name || '',
      customer_mobile: sale.customer_mobile || '',
      customer_dob: sale.customer_dob || '',
      payment_method: sale.payment_method
    });
    
    // Load sale items for editing
    try {
      const items = await databaseService.getSaleItems(sale.sale_id);
      setEditSaleItems(items);
      
      // Calculate totals
      const subtotal = items.reduce((sum: number, item: SaleItem) => sum + item.total_price, 0);
      const discount = sale.discount_amount;
      const tax = sale.tax_amount;
      const total = sale.final_amount;
      
      setEditTotals({ subtotal, discount, tax, total });
    } catch (err) {
      console.error('Error loading sale items for edit:', err);
      setError('Failed to load sale items');
    }
    
    setEditDialogOpen(true);
  };

  const handleDeleteSale = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleUpdateItemQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    try {
      // Get the current item
      const currentItem = editSaleItems.find(item => item.id === itemId);
      if (!currentItem) return;

      const quantityDifference = newQuantity - currentItem.quantity;
      
      // Create updated item for UI (database update will be handled by repriceItems)
      const updatedItem = {
        ...currentItem,
        quantity: newQuantity,
        total_price: currentItem.unit_price * newQuantity
      };

      // Update inventory stock
      const currentStock = await databaseService.getInventoryItemById(currentItem.item_id);
      if (currentStock) {
        const newStock = currentStock.stock_quantity - quantityDifference;
        if (newStock >= 0) {
          await databaseService.updateStockQuantity(currentItem.item_id, newStock);
        } else {
          setError('Insufficient stock available');
          return;
        }
      }
      
      // Update UI state
      // Update UI state (temporary), then reprice with full context
      const tempItems = editSaleItems.map(item => (item.id === itemId ? updatedItem : item));
      if (!selectedSale?.id) {
        setError('Sale ID not found');
        return;
      }
      const repricedItems = await repriceItems(tempItems, selectedSale.id);
      setEditSaleItems(repricedItems);
      
      // Totals are now calculated and updated inside repriceItems

      setSuccess('Quantity updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update quantity');
      console.error('Error updating quantity:', err);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      // Get the item details before removing
      const itemToRemove = editSaleItems.find(item => item.id === itemId);
      if (!itemToRemove) return;

      // Delete the item from database
      await databaseService.deleteSaleItem(itemId);
      
      // Restore inventory stock
      const currentStock = await databaseService.getInventoryItemById(itemToRemove.item_id);
      if (currentStock) {
        const newStock = currentStock.stock_quantity + itemToRemove.quantity;
        await databaseService.updateStockQuantity(itemToRemove.item_id, newStock);
      }

      // Remove from UI state, then reprice remaining
      const updatedItems = editSaleItems.filter(item => item.id !== itemId);
      if (!selectedSale?.id) {
        setError('Sale ID not found');
        return;
      }
      const repricedItems = await repriceItems(updatedItems, selectedSale.id);
      setEditSaleItems(repricedItems);
      
      // Totals are now calculated and updated inside repriceItems

      setSuccess('Item removed successfully and stock restored');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to remove item');
      console.error('Error removing item:', err);
    }
  };

  const handleAddInventoryItem = async (inventoryItem: InventoryItem) => {
    if (!selectedSale) return;

    try {
      // Calculate price using pricing service
      const cartItem = {
        item: inventoryItem,
        quantity: 1,
        unit_price: 0, // Will be calculated by pricing service
        total_price: 0,
        manual_override: false
      };
      
      const calculatedPrice = PricingService.calculateItemPrice(cartItem, editSaleItems.map(si => ({
        item: si.inventory_item!,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total_price: si.total_price,
        manual_override: si.manual_override
      })), [], false, 0, 0);

      // Create a new sale item
      const newSaleItem: Omit<SaleItem, 'id' | 'created_at'> = {
        sale_id: selectedSale.sale_id,
        item_id: inventoryItem.id,
        quantity: 1,
        unit_price: calculatedPrice,
        total_price: calculatedPrice,
        manual_override: false,
        inventory_item: inventoryItem
      };

      // Check if there's enough stock
      if (inventoryItem.stock_quantity < 1) {
        setError('Insufficient stock available');
        return;
      }

      // Add to database
      const newItemId = await databaseService.createSaleItem(newSaleItem);
      
      // Update inventory stock
      const newStock = inventoryItem.stock_quantity - 1;
      await databaseService.updateStockQuantity(inventoryItem.id, newStock);
      
      // Add to local state
      const newItem: SaleItem = {
        ...newSaleItem,
        id: newItemId,
        created_at: new Date().toISOString()
      };

      const updatedItems = [...editSaleItems, newItem];
      // Reprice with new item included
      if (!selectedSale?.id) {
        setError('Sale ID not found');
        return;
      }
      const repricedItems = await repriceItems(updatedItems, selectedSale.id);
      setEditSaleItems(repricedItems);

      // Totals are now calculated and updated inside repriceItems

      setSuccess('Item added successfully');
      setTimeout(() => setSuccess(''), 3000);

      // Clear search
      setInventorySearchTerm('');
    } catch (err) {
      setError('Failed to add item to sale');
      console.error('Error adding item to sale:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSale) return;

    try {
      setLoading(true);
      
      // Update sale details (totals are already updated in real-time by repriceItems)
      await databaseService.updateSale(selectedSale.id, {
        ...editFormData
      });
      
      // Refresh the sales list to show updated data
      await loadSales();
      setEditDialogOpen(false);
      setSelectedSale(null);
      setSuccess('Sale updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update sale');
      console.error('Error updating sale:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;

    try {
      setLoading(true);
      await databaseService.deleteSale(saleToDelete.id);
      await loadSales();
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    } catch (err) {
      setError('Failed to delete sale');
      console.error('Error deleting sale:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSale = (saleId: number) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSales.size === paginatedSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(paginatedSales.map(sale => sale.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedSales.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setLoading(true);
      const deletePromises = Array.from(selectedSales).map(saleId => 
        databaseService.deleteSale(saleId)
      );
      await Promise.all(deletePromises);
      await loadSales();
      setSelectedSales(new Set());
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete selected sales');
      console.error('Error deleting sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.sale_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && new Date(sale.created_at).toDateString() === new Date().toDateString()) ||
      (dateFilter === 'week' && new Date(sale.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && new Date(sale.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const matchesPayment = paymentFilter === 'all' || sale.payment_method === paymentFilter;
    
    return matchesSearch && matchesDate && matchesPayment;
  });

  const paginatedSales = filteredSales.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales History
      </Typography>

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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search Sales"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Date Filter</InputLabel>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  startAdornment={<FilterList />}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">Last 7 Days</MenuItem>
                  <MenuItem value="month">Last 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
             <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                 <InputLabel>Payment Filter</InputLabel>
                 <Select
                   value={paymentFilter}
                   label="Payment Filter"
                   onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'cash' | 'online' | 'mixed' | 'pending')}
                 >
                   <MenuItem value="all">All Payment Methods</MenuItem>
                   <MenuItem value="cash">Cash Only</MenuItem>
                   <MenuItem value="online">Online Only</MenuItem>
                   <MenuItem value="mixed">Mixed Only</MenuItem>
                   <MenuItem value="pending">Pending Only</MenuItem>
                 </Select>
               </FormControl>
             </Grid>
            <Grid item xs={12} sm={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteSweep />}
                  onClick={handleBulkDelete}
                  disabled={selectedSales.size === 0}
                >
                  Delete Selected ({selectedSales.size})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownloadCSV}
                  disabled={filteredSales.length === 0}
                >
                  Export CSV
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedSales.size === paginatedSales.length && paginatedSales.length > 0}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>Sale ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Total Amount</TableCell>
                      <TableCell>Discount</TableCell>
                      <TableCell>Final Amount</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale.id)}
                            onChange={() => handleSelectSale(sale.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {sale.sale_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sale.customer_name || 'Walk-in Customer'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {sale.customer_mobile || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {new Date(sale.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(sale.total_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {sale.discount_amount > 0 ? (
                            <Chip 
                              label={formatCurrency(sale.discount_amount)} 
                              color="success" 
                              size="small" 
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No discount
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {formatCurrency(sale.final_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={sale.payment_method} 
                            color={sale.payment_method === 'pending' ? 'error' : 'primary'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(sale)}
                            title="View Details"
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handlePrintReceipt(sale)}
                            title="Print Receipt"
                          >
                            <Print />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditSale(sale)}
                            title="Edit Sale"
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSale(sale)}
                            title="Delete Sale"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

               <TablePagination
                 rowsPerPageOptions={[10, 25, 50, 100]}
                 component="div"
                 count={filteredSales.length}
                 rowsPerPage={rowsPerPage}
                 page={page}
                 onPageChange={(_, newPage) => setPage(newPage)}
                 onRowsPerPageChange={(e) => {
                   setRowsPerPage(parseInt(e.target.value, 10));
                   setPage(0);
                 }}
               />
            </>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Sale Details - {selectedSale?.sale_id}
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Sale ID
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedSale.sale_id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedSale.created_at).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.customer_name || 'Walk-in Customer'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Mobile Number
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.customer_mobile || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(selectedSale.total_amount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Final Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {formatCurrency(selectedSale.final_amount)}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Items Sold
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Barcode</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Unit Price</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleDetails.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {item.inventory_item?.style_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.inventory_item?.sub_section_name} - {item.inventory_item?.color_name} ({item.inventory_item?.size})
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {item.inventory_item?.barcode || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Print />}
            onClick={() => selectedSale && handlePrintReceipt(selectedSale)}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); setSuccess(''); }} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Sale - {selectedSale?.sale_id}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Customer Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Customer Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={editFormData.customer_name}
                onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                placeholder="Enter customer name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile Number"
                value={editFormData.customer_mobile}
                onChange={(e) => setEditFormData({ ...editFormData, customer_mobile: e.target.value })}
                placeholder="Enter 10-digit mobile number"
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={editFormData.customer_dob}
                onChange={(e) => setEditFormData({ ...editFormData, customer_dob: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Optional - for birthday tracking"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={editFormData.payment_method}
                  onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value as 'cash' | 'online' | 'mixed' | 'pending' })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="mixed">Mixed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sale Items */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Sale Items</Typography>
            </Grid>
            <Grid item xs={12}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {editSaleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.inventory_item?.style_name || 'Unknown Item'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.inventory_item?.color_name} - {item.inventory_item?.size}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Remove />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                            >
                              <Add />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            ₹{item.unit_price.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            ₹{item.total_price.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveItem(item.id)}
                            color="error"
                            title="Remove Item"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Add Item from Inventory */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Add Item from Inventory</Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <TextField
                  fullWidth
                  label="Search Inventory"
                  value={inventorySearchTerm}
                  onChange={(e) => setInventorySearchTerm(e.target.value)}
                  placeholder="Search by barcode, style, color, or size..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                {filteredInventoryItems.length > 0 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="center">Stock</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredInventoryItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {item.style_name || 'Unknown Item'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.color_name} - {item.size} | {item.barcode}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography 
                                variant="body2" 
                                color={item.stock_quantity > 0 ? 'text.primary' : 'error'}
                              >
                                {item.stock_quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                ₹{getItemDisplayPrice(item).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleAddInventoryItem(item)}
                                disabled={item.stock_quantity <= 0}
                                startIcon={<Add />}
                              >
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                {inventorySearchTerm && filteredInventoryItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No items found matching "{inventorySearchTerm}"
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Totals */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>Bill Summary</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>₹{editTotals.subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Discount:</Typography>
                  <Typography color="success.main">-₹{editTotals.discount.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tax (GST):</Typography>
                  <Typography>₹{editTotals.tax.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">₹{editTotals.total.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setSuccess(''); }}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={loading || editSaleItems.length === 0}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Sale Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Sale</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete sale <strong>{saleToDelete?.sale_id}</strong>?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All sale items and related data will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Sale'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Selected Sales</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedSales.size}</strong> selected sales?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All selected sales, their items, and related data will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmBulkDelete} variant="contained" color="error" disabled={loading}>
            {loading ? 'Deleting...' : `Delete ${selectedSales.size} Sales`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesHistory;
