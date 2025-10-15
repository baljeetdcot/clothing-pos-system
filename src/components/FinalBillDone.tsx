import React, { useState, useEffect, useMemo } from 'react';
import { PricingService } from '../services/pricing';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Receipt,
  Edit,
  Save,
  Cancel,
  Visibility,
  Print,
  Download,
  ArrowUpward,
  ArrowDownward,
  Sort,
  CheckBox,
  CheckBoxOutlineBlank
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';
import { ReceiptService } from '../services/receiptService';
import { Sale, SaleItem, InventoryItem } from '../types';

interface FinalBillItem extends SaleItem {
  inventory_item: InventoryItem;
  sale: Sale;
  is_completed: boolean;
  final_bill_number?: string;
  memo?: string;
  completed_by?: number;
  completed_at?: string;
}

const FinalBillDone: React.FC = () => {
  const [allSalesData, setAllSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'pending' | 'completed'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('sale_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);

  useEffect(() => {
    loadAllSalesData();
  }, []);

  const loadAllSalesData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all sales
      const salesData = await databaseService.getAllSales();
      
      // Get all final bill statuses (item-level)
      let allFinalBillStatuses: any[] = [];
      try {
        allFinalBillStatuses = await databaseService.getAllFinalBillStatuses();
      } catch (error) {
        console.error('Error loading final bill statuses:', error);
        // Continue without final bill statuses for now
        allFinalBillStatuses = [];
      }
      
      // Create a map of sale_item_id to final bill status
      const finalBillMap = new Map();
      allFinalBillStatuses.forEach((status: any) => {
        finalBillMap.set(status.sale_item_id, status);
      });
      
      // For each sale, get its items
      const allItemsData = [];
      
      for (const sale of salesData) {
        try {
          const saleItems = await databaseService.getSaleItems(sale.sale_id);
          
          // Add each item with sale and final bill info
          const itemsWithBillInfo = saleItems.map((item: any) => {
            const finalBillStatus = finalBillMap.get(item.id);
            return {
              ...item,
              sale_id: sale.sale_id,
              sale_date: sale.created_at,
              customer_name: sale.customer_name || 'Walk-in Customer',
              customer_mobile: sale.customer_mobile,
              final_amount: sale.final_amount,
              payment_method: sale.payment_method,
              is_completed: finalBillStatus?.is_completed || false,
              final_bill_number: finalBillStatus?.final_bill_number || '',
              memo: finalBillStatus?.memo || '',
              completed_by: finalBillStatus?.completed_by,
              completed_at: finalBillStatus?.completed_at
            };
          });
          
          allItemsData.push(...itemsWithBillInfo);
        } catch (err) {
          console.error(`Error loading data for sale ${sale.sale_id}:`, err);
        }
      }
      
      setAllSalesData([...allItemsData]); // Create new array reference for useMemo
    } catch (err) {
      console.error('Error loading all sales data:', err);
      setError(`Failed to load sales data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (saleId: string, saleItemId: number, finalBillNumber: string, memo: string) => {
    try {
      
      // Validate inputs
      if (!saleId) {
        throw new Error('Sale ID is required');
      }
      if (!saleItemId) {
        throw new Error('Sale Item ID is required');
      }
      if (!finalBillNumber || finalBillNumber.trim() === '') {
        throw new Error('Final bill number is required');
      }
      
      await databaseService.createFinalBill(saleId, saleItemId, finalBillNumber, memo);
      setSuccess('Final bill marked as completed');
      setTimeout(() => setSuccess(''), 3000);
      setEditDialogOpen(false);
      loadAllSalesData(); // Reload all data
    } catch (err) {
      console.error('Error marking final bill as completed:', err);
      setError(`Failed to mark final bill as completed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleUpdateFinalBill = async (saleId: string, saleItemId: number, finalBillNumber: string, memo: string) => {
    try {
      await databaseService.updateFinalBill(saleId, saleItemId, finalBillNumber, memo);
      setSuccess('Final bill updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setEditDialogOpen(false);
      loadAllSalesData(); // Reload all data
    } catch (err) {
      console.error('Error updating final bill:', err);
      setError('Failed to update final bill');
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      
      // Validate required fields
      if (!item.sale_id) {
        throw new Error('Sale ID is missing');
      }
      if (!item.id) {
        throw new Error('Sale Item ID is missing');
      }
      
      // Check authentication status first
      try {
        const authStatus = await databaseService.checkAuthStatus();
      } catch (authError) {
        console.error('Auth check failed:', authError);
      }
      
      if (item.is_completed) {
        // Mark as pending
        await databaseService.markFinalBillAsPending(item.sale_id, item.id);
        setSuccess('Item marked as pending');
      } else {
        // Mark as completed
        await databaseService.createFinalBill(item.sale_id, item.id, `AUTO-${Date.now()}`, 'Auto-marked as completed');
        setSuccess('Item marked as completed');
      }
      setTimeout(() => setSuccess(''), 3000);
      loadAllSalesData(); // Reload all data
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(`Failed to toggle status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleQuickComplete = async (item: any) => {
    try {
      // Generate a smart bill number based on sale ID and timestamp
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const billNumber = `FB-${item.sale_id}-${timestamp}`;
      
      await databaseService.createFinalBill(item.sale_id, item.id, billNumber, 'Quick completed');
      setSuccess('Item marked as completed successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadAllSalesData(); // Reload all data
    } catch (err) {
      console.error('Error quick completing item:', err);
      setError(`Failed to mark item as completed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleItemSelect = (itemId: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSelectAll = () => {
    const pendingItems = filteredAndSortedItems.filter(item => !item.is_completed);
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map(item => item.id)));
    }
  };

  const handleBulkCompleteSelected = () => {
    if (selectedItems.size === 0) return;
    setBulkCompleteDialogOpen(true);
  };

  const handleBulkCompleteWithBillNumber = async (billNumber: string, memo: string) => {
    try {
      setLoading(true);
      const selectedItemsArray = Array.from(selectedItems);
      const itemsToComplete = filteredAndSortedItems.filter(item => selectedItemsArray.includes(item.id));
      
      // Process items in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < itemsToComplete.length; i += batchSize) {
        const batch = itemsToComplete.slice(i, i + batchSize);
        const promises = batch.map((item, index) => {
          const itemBillNumber = `${billNumber}-${String(i + index + 1).padStart(3, '0')}`;
          return databaseService.createFinalBill(item.sale_id, item.id, itemBillNumber, memo);
        });
        
        await Promise.all(promises);
      }
      
      setSuccess(`${itemsToComplete.length} items marked as completed successfully`);
      setTimeout(() => setSuccess(''), 5000);
      setSelectedItems(new Set());
      setBulkCompleteDialogOpen(false);
      loadAllSalesData(); // Reload all data
    } catch (err) {
      console.error('Error bulk completing items:', err);
      setError(`Failed to complete items: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handlePrintReceipt = async (item: any) => {
    try {
      // Get the sale data
      const sale = {
        id: item.sale_id,
        sale_id: item.sale_id,
        total_amount: item.final_amount,
        final_amount: item.final_amount,
        discount_amount: 0,
        tax_amount: 0,
        customer_name: item.customer_name,
        customer_mobile: item.customer_mobile,
        payment_method: item.payment_method || 'cash',
        created_at: item.sale_date,
        cashier_id: 1
      };

      // Get sale items for this sale
      const saleItems = await databaseService.getSaleItems(item.sale_id);
      
      // Convert to cart items format for receipt
      const cartItems = saleItems.map((saleItem: any) => ({
        item: saleItem.inventory_item,
        quantity: saleItem.quantity,
        unit_price: saleItem.unit_price,
        total_price: saleItem.total_price,
        manual_override: saleItem.manual_override
      }));

      // Get settings
      const settings = await databaseService.getSettings();
      // Fetch active offers for this customer (offers are now reusable)
      const offers = sale.customer_mobile
        ? await databaseService.getCustomerOffers(sale.customer_mobile)
        : [];

      // Recompute discount breakdown from offers and infer one-time discount like Sales page
      const recomputed = PricingService.calculateCartTotal(cartItems, offers, false, 0);
      const inferredOneTimeDiscount = Math.max(0, (sale.discount_amount || 0) - (recomputed.discount || 0));
      await ReceiptService.printReceipt(
        sale,
        cartItems,
        settings,
        'Admin',
        sale.customer_name,
        sale.customer_mobile,
        offers,
        false,
        inferredOneTimeDiscount
      );
      
      setSuccess('Receipt printed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error printing receipt:', err);
      setError('Failed to print receipt');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredAndSortedItems = allSalesData.filter(item => {
    // Filter by completion status
    if (filterCompleted === 'pending') {
      if (item.is_completed) return false;
    } else if (filterCompleted === 'completed') {
      if (!item.is_completed) return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.inventory_item?.style_name?.toLowerCase().includes(searchLower) ||
        item.inventory_item?.sub_section_name?.toLowerCase().includes(searchLower) ||
        item.inventory_item?.category?.toLowerCase().includes(searchLower) ||
        item.inventory_item?.item_code?.toLowerCase().includes(searchLower) ||
        item.customer_name?.toLowerCase().includes(searchLower) ||
        item.sale_id?.toLowerCase().includes(searchLower) ||
        item.final_bill_number?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'status':
        aValue = a.is_completed ? 1 : 0;
        bValue = b.is_completed ? 1 : 0;
        break;
      case 'sale_date':
        aValue = new Date(a.sale_date).getTime();
        bValue = new Date(b.sale_date).getTime();
        break;
      case 'customer_name':
        aValue = a.customer_name?.toLowerCase() || '';
        bValue = b.customer_name?.toLowerCase() || '';
        break;
      case 'item_name':
        aValue = `${a.inventory_item?.sub_section_name || ''} ${a.inventory_item?.category || ''}`.toLowerCase().trim();
        bValue = `${b.inventory_item?.sub_section_name || ''} ${b.inventory_item?.category || ''}`.toLowerCase().trim();
        break;
      case 'total_price':
        aValue = a.total_price || 0;
        bValue = b.total_price || 0;
        break;
      case 'final_bill_number':
        aValue = a.final_bill_number?.toLowerCase() || '';
        bValue = b.final_bill_number?.toLowerCase() || '';
        break;
      default:
        aValue = a.sale_date;
        bValue = b.sale_date;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
  });

  // Calculate category counts with completion status
  const getCategoryCount = (categoryName: string, isCompleted?: boolean) => {
    return allSalesData.filter(item => {
      // Handle cases where inventory_item might be null/undefined
      if (!item.inventory_item) {
        console.warn('Item missing inventory_item:', item);
        return false;
      }
      
      const category = item.inventory_item?.category?.toLowerCase()?.trim() || '';
      const subSection = item.inventory_item?.sub_section_name?.toLowerCase()?.trim() || '';
      const styleName = item.inventory_item?.style_name?.toLowerCase()?.trim() || '';
      
      // Combine all text fields for better matching, removing extra spaces
      const allText = `${category} ${subSection} ${styleName}`.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check if item matches category
      let matchesCategory = false;
      switch (categoryName.toLowerCase()) {
        case 'shirt':
          // Exclude t-shirts from shirts - be more specific
          matchesCategory = (
            (allText.includes('shirt') || allText.includes('shirts')) && 
            !allText.includes('t-shirt') && 
            !allText.includes('tshirt') && 
            !allText.includes('tee') &&
            !allText.includes('t shirt')
          );
          break;
        case 't-shirt':
          matchesCategory = (
            allText.includes('t-shirt') || 
            allText.includes('tshirt') || 
            allText.includes('tee') ||
            allText.includes('t shirt') ||
            (allText.includes('shirt') && (allText.includes('t') || allText.includes('tee')))
          );
          break;
        case 'denims':
          matchesCategory = (
            allText.includes('denim') || 
            allText.includes('denims') || 
            allText.includes('jeans') ||
            allText.includes('jean')
          );
          break;
        case 'casual trouser':
          // Look for trousers/pants that are casual or not explicitly formal
          const isTrouserCasual = allText.includes('trouser') || allText.includes('pant') || allText.includes('trousers') || allText.includes('pants');
          const isCasual = allText.includes('casual') || allText.includes('cotton') || allText.includes('chino');
          const isFormal = allText.includes('formal') || allText.includes('suit') || allText.includes('dress');
          matchesCategory = isTrouserCasual && (isCasual || (!isFormal && !allText.includes('jeans')));
          break;
        case 'formal trouser':
          // Look for trousers/pants that are explicitly formal
          const isTrouserFormal = allText.includes('trouser') || allText.includes('pant') || allText.includes('trousers') || allText.includes('pants');
          const isFormalExplicit = allText.includes('formal') || allText.includes('suit') || allText.includes('dress');
          matchesCategory = isTrouserFormal && isFormalExplicit;
          break;
        case 'other':
          // Items that don't match any specific category
          const isShirt = allText.includes('shirt') || allText.includes('shirts');
          const isTshirt = allText.includes('t-shirt') || allText.includes('tshirt') || allText.includes('tee') || allText.includes('t shirt');
          const isDenim = allText.includes('denim') || allText.includes('denims') || allText.includes('jeans') || allText.includes('jean');
          const isTrouserOther = allText.includes('trouser') || allText.includes('pant') || allText.includes('trousers') || allText.includes('pants');
          matchesCategory = !isShirt && !isTshirt && !isDenim && !isTrouserOther;
          break;
        default:
          matchesCategory = false;
      }
      
      // If completion status is specified, filter by it
      if (isCompleted !== undefined) {
        // Handle both boolean and number completion status
        const itemCompleted = Boolean(item.is_completed);
        const targetCompleted = Boolean(isCompleted);
        return matchesCategory && itemCompleted === targetCompleted;
      }
      
      return matchesCategory;
    }).reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  // Calculate financial totals
  const totalAmount = allSalesData.reduce((sum, item) => sum + item.total_price, 0);
  const completedAmount = allSalesData.filter(item => item.is_completed).reduce((sum, item) => sum + item.total_price, 0);
  const pendingAmount = totalAmount - completedAmount;

  // Calculate overall completed and pending item counts
  const completedItemsCount = allSalesData.filter(item => item.is_completed).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const pendingItemsCount = allSalesData.filter(item => !item.is_completed).reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Calculate category counts with completion status - using useState and useEffect for reliable updates
  const [categoryCounts, setCategoryCounts] = useState({
    completedShirt: 0,
    completedTshirt: 0,
    completedDenims: 0,
    completedCasualTrouser: 0,
    completedFormalTrouser: 0,
    completedOther: 0,
    pendingShirt: 0,
    pendingTshirt: 0,
    pendingDenims: 0,
    pendingCasualTrouser: 0,
    pendingFormalTrouser: 0,
    pendingOther: 0,
    totalShirt: 0,
    totalTshirt: 0,
    totalDenims: 0,
    totalCasualTrouser: 0,
    totalFormalTrouser: 0,
    totalOther: 0
  });

  // Recalculate category counts whenever allSalesData changes
  useEffect(() => {
    if (allSalesData.length === 0) {
      return;
    }
    
    // Debug: Test the getCategoryCount function
    console.log('Testing getCategoryCount function:');
    console.log('Completed denims:', getCategoryCount('denims', true));
    console.log('Completed t-shirts:', getCategoryCount('t-shirt', true));
    console.log('Completed shirts:', getCategoryCount('shirt', true));
    
    const newCategoryCounts = {
      // Completed items by category
      completedShirt: getCategoryCount('shirt', true),
      completedTshirt: getCategoryCount('t-shirt', true),
      completedDenims: getCategoryCount('denims', true),
      completedCasualTrouser: getCategoryCount('casual trouser', true),
      completedFormalTrouser: getCategoryCount('formal trouser', true),
      completedOther: getCategoryCount('other', true),
      
      // Pending items by category
      pendingShirt: getCategoryCount('shirt', false),
      pendingTshirt: getCategoryCount('t-shirt', false),
      pendingDenims: getCategoryCount('denims', false),
      pendingCasualTrouser: getCategoryCount('casual trouser', false),
      pendingFormalTrouser: getCategoryCount('formal trouser', false),
      pendingOther: getCategoryCount('other', false),
      
      // Total counts by category
      totalShirt: getCategoryCount('shirt'),
      totalTshirt: getCategoryCount('t-shirt'),
      totalDenims: getCategoryCount('denims'),
      totalCasualTrouser: getCategoryCount('casual trouser'),
      totalFormalTrouser: getCategoryCount('formal trouser'),
      totalOther: getCategoryCount('other')
    };
    
    setCategoryCounts(newCategoryCounts);
  }, [allSalesData]);


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading final bill data...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
          Final Bill Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search Items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item, customer, sale ID..."
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: <Visibility sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={filterCompleted}
              onChange={(e) => setFilterCompleted(e.target.value as 'all' | 'pending' | 'completed')}
              label="Filter Status"
            >
              <MenuItem value="all">All Items</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="sale_date">Sale Date</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="customer_name">Customer</MenuItem>
              <MenuItem value="item_name">Item Name</MenuItem>
              <MenuItem value="total_price">Total Price</MenuItem>
              <MenuItem value="final_bill_number">Bill Number</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Direction</InputLabel>
            <Select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              label="Direction"
            >
              <MenuItem value="asc">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpward sx={{ mr: 1, fontSize: 16 }} />
                  Ascending
                </Box>
              </MenuItem>
              <MenuItem value="desc">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowDownward sx={{ mr: 1, fontSize: 16 }} />
                  Descending
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Selection Action Bar */}
      {selectedItems.size > 0 && (
        <Card sx={{ mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={handleBulkCompleteSelected}
                  sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }}
                >
                  Mark as Completed
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedItems(new Set())}
                  sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Receipt sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">
                  Total Amount
                </Typography>
              </Box>
              <Typography variant="h3" component="p" sx={{ fontWeight: 'bold' }}>
                ₹{totalAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">
                  Completed
                </Typography>
              </Box>
              <Typography variant="h3" component="p" sx={{ fontWeight: 'bold' }}>
                ₹{completedAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Pending sx={{ mr: 1 }} />
                <Typography variant="h6" component="h3">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h3" component="p" sx={{ fontWeight: 'bold' }}>
                ₹{pendingAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            Category Summary
          </Typography>
        </Grid>
        
        {/* Total Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Total Completed
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {completedItemsCount}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Items: {allSalesData.filter(item => item.is_completed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Total Pending
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {pendingItemsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Total Items
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {completedItemsCount + pendingItemsCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #9c27b0 0%, #e91e63 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completion Rate
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {completedItemsCount + pendingItemsCount > 0 
                  ? `${Math.round((completedItemsCount / (completedItemsCount + pendingItemsCount)) * 100)}%`
                  : '0%'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Shirts */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed Shirts
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedShirt}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending Shirts
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingShirt}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* T-Shirts */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed T-Shirts
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedTshirt}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending T-Shirts
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingTshirt}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Denims */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed Denims
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedDenims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending Denims
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingDenims}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Casual Trousers */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed Casual Trousers
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedCasualTrouser}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending Casual Trousers
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingCasualTrouser}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Formal Trousers */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed Formal Trousers
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedFormalTrouser}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending Formal Trousers
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingFormalTrouser}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Other */}
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Completed Other
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.completedOther}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
            color: 'white',
            height: '100%',
            textAlign: 'center'
          }}>
            <CardContent>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                Pending Other
              </Typography>
              <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                {categoryCounts.pendingOther}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Sales Items List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold' }}>
              All Sold Items ({filteredAndSortedItems.length} items)
            </Typography>
          </Box>
          {allSalesData.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No sales data found.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'grey.50' 
                  }}>
                    <TableCell sx={{ width: 50 }}>
                      <IconButton 
                        size="small" 
                        onClick={handleSelectAll}
                        sx={{ p: 0.5 }}
                      >
                        {selectedItems.size === filteredAndSortedItems.filter(item => !item.is_completed).length && 
                         filteredAndSortedItems.filter(item => !item.is_completed).length > 0 ? 
                          <CheckBox color="primary" /> : 
                          <CheckBoxOutlineBlank />
                        }
                      </IconButton>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'sale_date') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('sale_date');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Sale Info
                        {sortField === 'sale_date' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'customer_name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('customer_name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Customer
                        {sortField === 'customer_name' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'item_name') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('item_name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Item Details
                        {sortField === 'item_name' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Unit Price</TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'total_price') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('total_price');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Total
                        {sortField === 'total_price' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'final_bill_number') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('final_bill_number');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Final Bill Number
                        {sortField === 'final_bill_number' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: (theme) => theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'action.hover' 
                        }
                      }}
                      onClick={() => {
                        if (sortField === 'status') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('status');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Status & Toggle
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ArrowUpward sx={{ ml: 1, fontSize: 16 }} /> : <ArrowDownward sx={{ ml: 1, fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedItems.map((item, index) => {
                    return (
                      <TableRow 
                        key={index} 
                        sx={{ 
                          backgroundColor: item.is_completed 
                            ? (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(76, 175, 80, 0.1)' 
                              : 'success.light'
                            : selectedItems.has(item.id)
                              ? (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(25, 118, 210, 0.1)'
                                : 'primary.light'
                              : 'transparent',
                          '&:hover': { 
                            backgroundColor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'action.hover' 
                          }
                        }}
                      >
                        <TableCell sx={{ width: 50 }}>
                          {!item.is_completed && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleItemSelect(item.id)}
                              sx={{ p: 0.5 }}
                            >
                              {selectedItems.has(item.id) ? 
                                <CheckBox color="primary" /> : 
                                <CheckBoxOutlineBlank />
                              }
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {item.sale_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(item.sale_date).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ₹{item.final_amount}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {item.customer_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.customer_mobile || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {item.inventory_item?.sub_section_name || 'N/A'} {item.inventory_item?.category || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.inventory_item?.style_name || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.inventory_item?.item_code || 'N/A'} - {item.inventory_item?.color_name || 'N/A'} - {item.inventory_item?.size || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {item.quantity || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            ₹{(item.unit_price || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            ₹{(item.total_price || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {item.final_bill_number || 'Not Set'}
                            </Typography>
                            {item.memo && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {item.memo.length > 20 ? `${item.memo.substring(0, 20)}...` : item.memo}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Chip
                              icon={item.is_completed ? <CheckCircle /> : <Pending />}
                              label={item.is_completed ? 'Completed' : 'Pending'}
                              color={item.is_completed ? 'success' : 'warning'}
                              variant="filled"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {!item.is_completed && (
                              <Tooltip title="Quick Mark as Completed">
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  onClick={() => handleQuickComplete(item)}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Edit Final Bill">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print Receipt">
                              <IconButton 
                                size="small" 
                                color="secondary"
                                onClick={() => handlePrintReceipt(item)}
                              >
                                <Print />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Edit Final Bill Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Edit sx={{ mr: 1, color: 'primary.main' }} />
            Edit Final Bill Information
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingItem && (
            <FinalBillForm
              saleId={editingItem.sale_id}
              saleItemId={editingItem.id}
              isCompleted={editingItem.is_completed}
              finalBillNumber={editingItem.final_bill_number || ''}
              memo={editingItem.memo || ''}
              onMarkCompleted={handleMarkCompleted}
              onUpdate={handleUpdateFinalBill}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Complete Dialog */}
      <Dialog open={bulkCompleteDialogOpen} onClose={() => setBulkCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
            Mark Selected Items as Completed
          </Box>
        </DialogTitle>
        <DialogContent>
          <BulkCompleteForm
            selectedItems={selectedItems}
            allItems={filteredAndSortedItems}
            onComplete={handleBulkCompleteWithBillNumber}
            onCancel={() => setBulkCompleteDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

interface FinalBillFormProps {
  saleId: string;
  saleItemId: number;
  isCompleted: boolean;
  finalBillNumber: string;
  memo: string;
  onMarkCompleted: (saleId: string, saleItemId: number, finalBillNumber: string, memo: string) => void;
  onUpdate: (saleId: string, saleItemId: number, finalBillNumber: string, memo: string) => void;
}

const FinalBillForm: React.FC<FinalBillFormProps> = ({
  saleId,
  saleItemId,
  isCompleted,
  finalBillNumber,
  memo,
  onMarkCompleted,
  onUpdate
}) => {
  const [billNumber, setBillNumber] = useState(finalBillNumber);
  const [memoText, setMemoText] = useState(memo);

  useEffect(() => {
    setBillNumber(finalBillNumber);
    setMemoText(memo);
  }, [finalBillNumber, memo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) {
      onUpdate(saleId, saleItemId, billNumber, memoText);
    } else {
      onMarkCompleted(saleId, saleItemId, billNumber, memoText);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Final Bill Number"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            placeholder="Enter final bill number"
            required
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              icon={isCompleted ? <CheckCircle /> : <Pending />}
              label={isCompleted ? 'Final bill completed' : 'Pending final bill'}
              color={isCompleted ? 'success' : 'warning'}
              variant="filled"
              sx={{ fontSize: '0.875rem' }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Memo"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="Enter any notes or comments..."
            multiline
            rows={3}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={isCompleted ? <Edit /> : <Save />}
              color={isCompleted ? 'primary' : 'success'}
            >
              {isCompleted ? 'Update Final Bill' : 'Mark as Completed'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

interface BulkCompleteFormProps {
  selectedItems: Set<number>;
  allItems: any[];
  onComplete: (billNumber: string, memo: string) => void;
  onCancel: () => void;
}

const BulkCompleteForm: React.FC<BulkCompleteFormProps> = ({
  selectedItems,
  allItems,
  onComplete,
  onCancel
}) => {
  const [billNumber, setBillNumber] = useState('');
  const [memo, setMemo] = useState('');

  const selectedItemsArray = Array.from(selectedItems);
  const itemsToShow = allItems.filter(item => selectedItemsArray.includes(item.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber.trim()) {
      alert('Please enter a bill number');
      return;
    }
    onComplete(billNumber.trim(), memo.trim());
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Selected Items ({selectedItems.size})
      </Typography>
      
      <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        {itemsToShow.map((item, index) => (
          <Box key={item.id} sx={{ mb: 1, fontSize: '0.875rem' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {item.sale_id} - {item.inventory_item?.sub_section_name || 'N/A'} {item.inventory_item?.category || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Customer: {item.customer_name} | Qty: {item.quantity} | ₹{item.total_price}
            </Typography>
          </Box>
        ))}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Base Bill Number"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            placeholder="Enter base bill number (e.g., FB-2024-001)"
            required
            variant="outlined"
            helperText="Each item will get a sequential number (e.g., FB-2024-001-001, FB-2024-001-002)"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Chip
              icon={<CheckCircle />}
              label={`${selectedItems.size} items will be completed`}
              color="success"
              variant="filled"
              sx={{ fontSize: '0.875rem' }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Enter any notes or comments..."
            multiline
            rows={3}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              size="large"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
              color="success"
            >
              Complete {selectedItems.size} Items
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinalBillDone;
