import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  TextField,
  InputAdornment,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Search,
  Cake,
  CalendarToday,
  Person,
  Phone,
  Email,
  Send
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';

interface BirthdayCustomer {
  id: number;
  customer_name: string;
  customer_mobile: string;
  customer_dob: string;
  last_order_date: string;
  total_orders: number;
  total_spent: number;
  age: number;
}

const Birthday: React.FC = () => {
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayCustomer[]>([]);
  const [tomorrowBirthdays, setTomorrowBirthdays] = useState<BirthdayCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [wishDialogOpen, setWishDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<BirthdayCustomer | null>(null);
  const [wishMessage, setWishMessage] = useState('');

  useEffect(() => {
    loadBirthdayCustomers();
  }, []);

  const loadBirthdayCustomers = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all sales with customer DOB
      const sales = await databaseService.getAllSales();
      
      // Filter sales that have customer DOB
      const salesWithDOB = sales.filter((sale: any) => sale.customer_dob);
      
      // Group by customer mobile to get unique customers
      const customerMap = new Map<string, any>();
      
      salesWithDOB.forEach((sale: any) => {
        const mobile = sale.customer_mobile;
        if (!customerMap.has(mobile)) {
          customerMap.set(mobile, {
            customer_name: sale.customer_name,
            customer_mobile: sale.customer_mobile,
            customer_dob: sale.customer_dob,
            orders: [],
            total_spent: 0
          });
        }
        
        const customer = customerMap.get(mobile);
        customer.orders.push(sale);
        customer.total_spent += sale.final_amount;
      });

      // Get today's and tomorrow's dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const todayMonth = today.getMonth() + 1; // JavaScript months are 0-based
      const todayDay = today.getDate();
      const tomorrowMonth = tomorrow.getMonth() + 1;
      const tomorrowDay = tomorrow.getDate();

      const todayBirthdayCustomers: BirthdayCustomer[] = [];
      const tomorrowBirthdayCustomers: BirthdayCustomer[] = [];

      for (const [mobile, customer] of Array.from(customerMap)) {
        if (customer.customer_dob) {
          const dob = new Date(customer.customer_dob);
          const dobMonth = dob.getMonth() + 1;
          const dobDay = dob.getDate();

          const age = today.getFullYear() - dob.getFullYear();
          const lastOrder = customer.orders.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          const customerData = {
            id: Math.random(), // Temporary ID for React key
            customer_name: customer.customer_name,
            customer_mobile: customer.customer_mobile,
            customer_dob: customer.customer_dob,
            last_order_date: lastOrder ? lastOrder.created_at : 'No orders',
            total_orders: customer.orders.length,
            total_spent: customer.total_spent,
            age: age
          };

          // Check if birthday is today
          if (dobMonth === todayMonth && dobDay === todayDay) {
            todayBirthdayCustomers.push(customerData);
          }
          
          // Check if birthday is tomorrow
          if (dobMonth === tomorrowMonth && dobDay === tomorrowDay) {
            tomorrowBirthdayCustomers.push(customerData);
          }
        }
      }

      setTodayBirthdays(todayBirthdayCustomers);
      setTomorrowBirthdays(tomorrowBirthdayCustomers);
    } catch (err) {
      setError('Failed to load birthday customers');
      console.error('Error loading birthday customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWish = (customer: BirthdayCustomer) => {
    setSelectedCustomer(customer);
    setWishMessage(`Happy Birthday ${customer.customer_name}! 🎉🎂`);
    setWishDialogOpen(true);
  };

  const handleSendWishConfirm = () => {
    // Here you could integrate with SMS/WhatsApp API
    setSuccess(`Birthday wish sent to ${selectedCustomer?.customer_name}!`);
    setTimeout(() => setSuccess(''), 3000);
    setWishDialogOpen(false);
  };

  const filteredTodayCustomers = todayBirthdays.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_mobile.includes(searchTerm)
  );

  const filteredTomorrowCustomers = tomorrowBirthdays.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_mobile.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <Cake sx={{ mr: 2, verticalAlign: 'middle' }} />
          Birthday Customers
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<Cake />}
            label={`${todayBirthdays.length} Today`}
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<CalendarToday />}
            label={`${tomorrowBirthdays.length} Tomorrow`}
            color="secondary"
            variant="outlined"
          />
        </Box>
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

      {/* Refresh Button */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={loadBirthdayCustomers}
              disabled={loading}
              startIcon={<CalendarToday />}
            >
              Refresh Birthdays
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by customer name or mobile number..."
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
        </CardContent>
      </Card>

      {/* Today's Birthdays */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Cake sx={{ mr: 1, color: 'primary.main' }} />
            Today's Birthdays ({filteredTodayCustomers.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Total Orders</TableCell>
                  <TableCell>Total Spent</TableCell>
                  <TableCell>Last Order</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredTodayCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        No birthdays today!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTodayCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body1" fontWeight="bold">
                            {customer.customer_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" fontFamily="monospace">
                            {customer.customer_mobile}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${customer.age} years`}
                          color="secondary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.total_orders}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {formatCurrency(customer.total_spent)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {customer.last_order_date === 'No orders' 
                            ? 'No orders' 
                            : formatDate(customer.last_order_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleSendWish(customer)}
                          color="primary"
                        >
                          <Send />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Tomorrow's Birthdays */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <CalendarToday sx={{ mr: 1, color: 'secondary.main' }} />
            Tomorrow's Birthdays ({filteredTomorrowCustomers.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Total Orders</TableCell>
                  <TableCell>Total Spent</TableCell>
                  <TableCell>Last Order</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredTomorrowCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        No birthdays tomorrow!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTomorrowCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body1" fontWeight="bold">
                            {customer.customer_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" fontFamily="monospace">
                            {customer.customer_mobile}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${customer.age} years`}
                          color="secondary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {customer.total_orders}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {formatCurrency(customer.total_spent)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {customer.last_order_date === 'No orders' 
                            ? 'No orders' 
                            : formatDate(customer.last_order_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleSendWish(customer)}
                          color="secondary"
                        >
                          <Send />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Birthday Wish Dialog */}
      <Dialog open={wishDialogOpen} onClose={() => setWishDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Cake sx={{ mr: 1, color: 'primary.main' }} />
            Send Birthday Wish
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Customer:</strong> {selectedCustomer?.customer_name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Mobile:</strong> {selectedCustomer?.customer_mobile}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Age:</strong> {selectedCustomer?.age} years old
            </Typography>
            <TextField
              fullWidth
              label="Birthday Message"
              multiline
              rows={4}
              value={wishMessage}
              onChange={(e) => setWishMessage(e.target.value)}
              placeholder="Enter your birthday message..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWishDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendWishConfirm}
            variant="contained"
            startIcon={<Send />}
          >
            Send Wish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Birthday;
