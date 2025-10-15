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
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Search,
  Visibility,
  Edit,
  Delete,
  Person,
  Phone,
  Email,
  ShoppingCart,
  TrendingUp,
  FileDownload
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/adaptiveDatabase';
import { Sale, CustomerOffer } from '../types';

interface CustomerData {
  customer_mobile: string;
  customer_name: string;
  customer_dob?: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  active_offers: number;
}

const Customers: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [customerDetails, setCustomerDetails] = useState<{
    sales: Sale[];
    offers: CustomerOffer[];
  }>({ sales: [], offers: [] });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_dob: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all sales to extract customer data
      const allSales = await databaseService.getAllSales();
      
      // Group sales by customer mobile
      const customerMap = new Map<string, CustomerData>();
      
      for (const sale of allSales) {
        if (!sale.customer_mobile) continue;
        
        const mobile = sale.customer_mobile;
        if (!customerMap.has(mobile)) {
          customerMap.set(mobile, {
            customer_mobile: mobile,
            customer_name: sale.customer_name || 'Unknown Customer',
            customer_dob: sale.customer_dob,
            total_orders: 0,
            total_spent: 0,
            last_order_date: sale.created_at,
            active_offers: 0
          });
        }
        
        const customer = customerMap.get(mobile)!;
        customer.total_orders += 1;
        customer.total_spent += sale.final_amount;
        
        // Update last order date if this sale is more recent
        if (new Date(sale.created_at) > new Date(customer.last_order_date)) {
          customer.last_order_date = sale.created_at;
        }
      }
      
      // Get active offers count for each customer
      const customerEntries = Array.from(customerMap.entries());
      for (const [mobile, customer] of customerEntries) {
        try {
          const offers = await databaseService.getCustomerOffers(mobile);
          customer.active_offers = offers.filter((offer: CustomerOffer) => !offer.is_used).length;
        } catch (err) {
          console.error('Error loading offers for customer:', mobile, err);
        }
      }
      
      const customerList = Array.from(customerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent); // Sort by total spent
      
      setCustomers(customerList);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDetails = async (customer: CustomerData) => {
    try {
      const sales = await databaseService.getSalesByDateRange('2020-01-01', new Date().toISOString().split('T')[0]);
      const customerSales = sales.filter((sale: Sale) => sale.customer_mobile === customer.customer_mobile);
      
      const offers = await databaseService.getCustomerOffers(customer.customer_mobile);
      
      setCustomerDetails({ sales: customerSales, offers });
    } catch (err) {
      console.error('Error loading customer details:', err);
    }
  };

  const handleViewDetails = async (customer: CustomerData) => {
    setSelectedCustomer(customer);
    await loadCustomerDetails(customer);
    setDetailsDialogOpen(true);
  };

  const handleEditCustomer = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setEditFormData({
      customer_name: customer.customer_name,
      customer_mobile: customer.customer_mobile,
      customer_dob: customer.customer_dob || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      
      // Update all sales for this customer with new name
      const sales = await databaseService.getSalesByDateRange('2020-01-01', new Date().toISOString().split('T')[0]);
      const customerSales = sales.filter((sale: Sale) => sale.customer_mobile === selectedCustomer.customer_mobile);
      
      for (const sale of customerSales) {
        await databaseService.updateSale(sale.id, {
          customer_name: editFormData.customer_name,
          customer_mobile: editFormData.customer_mobile,
          customer_dob: editFormData.customer_dob || undefined,
          payment_method: sale.payment_method
        });
      }
      
      await loadCustomers();
      setEditDialogOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      setError('Failed to update customer');
      console.error('Error updating customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer: CustomerData) => {
    const matchesSearch = 
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_mobile.includes(searchTerm);
    
    return matchesSearch;
  });

  const paginatedCustomers = filteredCustomers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const exportToCSV = () => {
    const headers = [
      'Customer Name',
      'Mobile Number',
      'Total Orders',
      'Total Spent (₹)',
      'Last Order Date',
      'Active Offers'
    ];

    const csvData = filteredCustomers.map(customer => [
      customer.customer_name,
      customer.customer_mobile,
      customer.total_orders,
      customer.total_spent.toFixed(2),
      customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-IN') : 'No orders',
      customer.active_offers
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Customers
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownload />}
          onClick={exportToCSV}
          disabled={loading || filteredCustomers.length === 0}
        >
          Export CSV
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search Customers"
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
            <Grid item xs={12} sm={6} md={8}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Total Customers: {filteredCustomers.length}
                </Typography>
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
                      <TableCell>Customer</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Date of Birth</TableCell>
                      <TableCell>Total Orders</TableCell>
                      <TableCell>Total Spent</TableCell>
                      <TableCell>Last Order</TableCell>
                      <TableCell>Active Offers</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedCustomers.map((customer) => (
                      <TableRow key={customer.customer_mobile} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {getInitials(customer.customer_name)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {customer.customer_name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {customer.customer_mobile}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {customer.customer_dob ? formatDate(customer.customer_dob) : 'Not provided'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<ShoppingCart />}
                            label={customer.total_orders}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {formatCurrency(customer.total_spent)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(customer.last_order_date)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<TrendingUp />}
                            label={customer.active_offers}
                            color={customer.active_offers > 0 ? 'success' : 'default'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(customer)}
                                color="primary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Customer">
                              <IconButton
                                size="small"
                                onClick={() => handleEditCustomer(customer)}
                                color="secondary"
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredCustomers.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Customer Details - {selectedCustomer?.customer_name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Sales History ({customerDetails.sales.length})
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sale ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerDetails.sales.slice(0, 10).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.sale_id}</TableCell>
                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                        <TableCell>{formatCurrency(sale.final_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {customerDetails.sales.length > 10 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Showing first 10 of {customerDetails.sales.length} sales
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Active Offers ({customerDetails.offers.filter((o: CustomerOffer) => !o.is_used).length})
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Offer Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Valid Until</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerDetails.offers.filter((o: CustomerOffer) => !o.is_used).map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <Chip
                            label={offer.offer_type.replace('_', ' ')}
                            size="small"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>{offer.offer_description}</TableCell>
                        <TableCell>{formatDate(offer.valid_until)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Name"
                value={editFormData.customer_name}
                onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                placeholder="Enter customer name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mobile Number"
                value={editFormData.customer_mobile}
                onChange={(e) => setEditFormData({ ...editFormData, customer_mobile: e.target.value })}
                placeholder="Enter 10-digit mobile number"
                inputProps={{ maxLength: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={editFormData.customer_dob}
                onChange={(e) => setEditFormData({ ...editFormData, customer_dob: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;

