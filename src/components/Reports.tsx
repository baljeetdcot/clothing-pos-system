import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Person,
  Download,
  Refresh,
  BarChart,
  PieChart
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/adaptiveDatabase';
import { Sale, SaleItem, InventoryItem } from '../types';

interface SalesReport {
  period: string;
  totalSales: number;
  totalAmount: number;
  totalDiscount: number;
  totalTax: number;
  averageOrderValue: number;
  transactionCount: number;
}

interface CategorySizeAnalysis {
  category: string;
  size: string;
  totalQuantitySold: number;
  totalRevenue: number;
  salesCount: number;
  availableStock: number;
  stockTurnover: number; // sold/available ratio
}

interface CustomerAnalysis {
  customer_name: string;
  customer_mobile: string;
  totalPurchases: number;
  totalAmount: number;
  lastPurchase: string;
  averageOrderValue: number;
  favoriteCategory: string;
  purchaseCount: number;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [reportPeriod, setReportPeriod] = useState('week');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

  // Sales Reports Data
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [categorySizeAnalysis, setCategorySizeAnalysis] = useState<CategorySizeAnalysis[]>([]);
  const [customerAnalysis, setCustomerAnalysis] = useState<CustomerAnalysis[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
    loadReports();
    }
  }, [reportPeriod, customDateRange, user]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');

      const { startDate, endDate } = getDateRange();
      
      // Load all reports in parallel
      const [salesData, categorySizeData, customerData] = await Promise.all([
        loadSalesReports(startDate, endDate),
        loadCategorySizeAnalysis(startDate, endDate),
        loadCustomerAnalysis(startDate, endDate)
      ]);

      setSalesReports(salesData);
      setCategorySizeAnalysis(categorySizeData);
      setCustomerAnalysis(customerData);
    } catch (err) {
      setError('Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
      const now = new Date();
      let startDate: Date;
    let endDate: Date = now;

    switch (reportPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      case 'custom':
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
          break;
        default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const loadSalesReports = async (startDate: Date, endDate: Date): Promise<SalesReport[]> => {
    const sales = await databaseService.getSalesByDateRange(startDate.toISOString(), endDate.toISOString());
    
    // Group by different periods
    const reports: SalesReport[] = [];
    
    if (reportPeriod === 'today') {
      // Hourly breakdown for today
      const hourlyData: { [key: string]: Sale[] } = {};
      sales.forEach((sale: Sale) => {
        const hour = new Date(sale.created_at).getHours();
        const hourKey = `${hour}:00`;
        if (!hourlyData[hourKey]) hourlyData[hourKey] = [];
        hourlyData[hourKey].push(sale);
      });

      Object.entries(hourlyData).forEach(([hour, hourSales]) => {
        const totalAmount = hourSales.reduce((sum, sale) => sum + sale.final_amount, 0);
        const totalDiscount = hourSales.reduce((sum, sale) => sum + sale.discount_amount, 0);
        const totalTax = hourSales.reduce((sum, sale) => sum + sale.tax_amount, 0);
        
        reports.push({
          period: hour,
          totalSales: hourSales.length,
          totalAmount,
          totalDiscount,
          totalTax,
          averageOrderValue: hourSales.length > 0 ? totalAmount / hourSales.length : 0,
          transactionCount: hourSales.length
        });
      });
    } else if (reportPeriod === 'week') {
      // Daily breakdown for week
      const dailyData: { [key: string]: Sale[] } = {};
      sales.forEach((sale: Sale) => {
        const date = new Date(sale.created_at).toDateString();
        if (!dailyData[date]) dailyData[date] = [];
        dailyData[date].push(sale);
      });

      Object.entries(dailyData).forEach(([date, daySales]) => {
        const totalAmount = daySales.reduce((sum, sale) => sum + sale.final_amount, 0);
        const totalDiscount = daySales.reduce((sum, sale) => sum + sale.discount_amount, 0);
        const totalTax = daySales.reduce((sum, sale) => sum + sale.tax_amount, 0);
        
        reports.push({
          period: new Date(date).toLocaleDateString(),
          totalSales: daySales.length,
          totalAmount,
          totalDiscount,
          totalTax,
          averageOrderValue: daySales.length > 0 ? totalAmount / daySales.length : 0,
          transactionCount: daySales.length
        });
      });
    } else {
      // Overall summary
      const totalAmount = sales.reduce((sum: number, sale: Sale) => sum + sale.final_amount, 0);
      const totalDiscount = sales.reduce((sum: number, sale: Sale) => sum + sale.discount_amount, 0);
      const totalTax = sales.reduce((sum: number, sale: Sale) => sum + sale.tax_amount, 0);
      
      reports.push({
        period: `${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Summary`,
        totalSales: sales.length,
        totalAmount,
        totalDiscount,
        totalTax,
        averageOrderValue: sales.length > 0 ? totalAmount / sales.length : 0,
        transactionCount: sales.length
      });
    }

    return reports.sort((a, b) => a.period.localeCompare(b.period));
  };

  const loadCategorySizeAnalysis = async (startDate: Date, endDate: Date): Promise<CategorySizeAnalysis[]> => {
    const sales = await databaseService.getSalesByDateRange(startDate.toISOString(), endDate.toISOString());
    const categorySizeMap: { [key: string]: CategorySizeAnalysis } = {};

    // First, get all inventory items to build complete category-size map
    const allInventoryItems = await databaseService.getInventoryItems();

    // Initialize all category-size combinations from inventory (including those with 0 sales)
    allInventoryItems.forEach((invItem: InventoryItem) => {
      const category = invItem.sub_section_name || invItem.category || 'Unknown';
      const size = invItem.size || 'Unknown';
      const key = `${category}-${size}`;
      
      if (!categorySizeMap[key]) {
        categorySizeMap[key] = {
          category,
          size,
          totalQuantitySold: 0,
          totalRevenue: 0,
          salesCount: 0,
          availableStock: 0,
          stockTurnover: 0
        };
      }
      
      // Add to available stock
      categorySizeMap[key].availableStock += invItem.stock_quantity;
    });

    // Now process sales to add sold quantities and revenue
    for (const sale of sales) {
      const saleItems = await databaseService.getSaleItems(sale.sale_id);
      
      for (const saleItem of saleItems) {
        if (!saleItem.inventory_item) continue;
        
        const item = saleItem.inventory_item;
        const category = item.sub_section_name || item.category || 'Unknown';
        const size = item.size || 'Unknown';
        const key = `${category}-${size}`;
        
        // If this category-size combination doesn't exist in inventory, create it
        if (!categorySizeMap[key]) {
          categorySizeMap[key] = {
            category,
            size,
            totalQuantitySold: 0,
            totalRevenue: 0,
            salesCount: 0,
            availableStock: 0,
            stockTurnover: 0
          };
        }
        
        categorySizeMap[key].totalQuantitySold += saleItem.quantity;
        categorySizeMap[key].totalRevenue += saleItem.total_price;
        categorySizeMap[key].salesCount += 1;
      }
    }

    // Calculate stock turnover ratio
    Object.values(categorySizeMap).forEach(analysis => {
      analysis.stockTurnover = analysis.availableStock > 0 
        ? analysis.totalQuantitySold / analysis.availableStock 
        : analysis.totalQuantitySold; // If no stock available, turnover is just the sold quantity
    });

    // Filter to show only items with at least 1 unit available, then sort by quantity sold
    return Object.values(categorySizeMap)
      .filter(analysis => analysis.availableStock > 0)
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
  };

  const loadCustomerAnalysis = async (startDate: Date, endDate: Date): Promise<CustomerAnalysis[]> => {
    const sales = await databaseService.getSalesByDateRange(startDate.toISOString(), endDate.toISOString());
    const customerMap: { [key: string]: CustomerAnalysis } = {};

    for (const sale of sales) {
      if (!sale.customer_name && !sale.customer_mobile) continue;
      
      const key = sale.customer_mobile || sale.customer_name || 'unknown';
      
      if (!customerMap[key]) {
        customerMap[key] = {
          customer_name: sale.customer_name || 'Unknown',
          customer_mobile: sale.customer_mobile || '',
          totalPurchases: 0,
          totalAmount: 0,
          lastPurchase: sale.created_at,
          averageOrderValue: 0,
          favoriteCategory: '',
          purchaseCount: 0
        };
      }
      
      customerMap[key].totalPurchases += 1;
      customerMap[key].totalAmount += sale.final_amount;
      customerMap[key].purchaseCount += 1;
      
      if (new Date(sale.created_at) > new Date(customerMap[key].lastPurchase)) {
        customerMap[key].lastPurchase = sale.created_at;
      }
    }

    // Calculate averages and find favorite categories
    for (const customer of Object.values(customerMap)) {
      customer.averageOrderValue = customer.totalAmount / customer.totalPurchases;
      
      // Find favorite category by analyzing their purchases
      const customerSales = sales.filter((sale: Sale) => 
        (sale.customer_mobile && sale.customer_mobile === customer.customer_mobile) ||
        (sale.customer_name && sale.customer_name === customer.customer_name)
      );
      
      const categoryCount: { [key: string]: number } = {};
      for (const sale of customerSales) {
        const saleItems = await databaseService.getSaleItems(sale.sale_id);
        for (const item of saleItems) {
          if (item.inventory_item?.sub_section_name) {
            const category = item.inventory_item.sub_section_name;
            categoryCount[category] = (categoryCount[category] || 0) + item.quantity;
          }
        }
      }
      
      const favoriteCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0];
      customer.favoriteCategory = favoriteCategory ? favoriteCategory[0] : 'Unknown';
    }

    return Object.values(customerMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 50);
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const handleExportCSV = () => {
    let csvContent = '';
    
    if (activeTab === 0) {
      // Sales Reports CSV
      csvContent = 'Period,Transactions,Total Amount,Discount,Tax,Average Order Value\n';
      salesReports.forEach(report => {
        csvContent += `${report.period},${report.transactionCount},${report.totalAmount.toFixed(2)},${report.totalDiscount.toFixed(2)},${report.totalTax.toFixed(2)},${report.averageOrderValue.toFixed(2)}\n`;
      });
    } else if (activeTab === 1) {
      // Category Size Analysis CSV
      csvContent = 'Category,Size,Quantity Sold,Revenue,Sales Count,Available Stock,Stock Turnover\n';
      categorySizeAnalysis.forEach(analysis => {
        csvContent += `${analysis.category},${analysis.size},${analysis.totalQuantitySold},${analysis.totalRevenue.toFixed(2)},${analysis.salesCount},${analysis.availableStock},${analysis.stockTurnover.toFixed(2)}\n`;
      });
    } else if (activeTab === 2) {
      // Customer Analysis CSV
      csvContent = 'Customer Name,Mobile,Total Purchases,Total Amount,Average Order Value,Last Purchase,Favorite Category\n';
      customerAnalysis.forEach(customer => {
        csvContent += `${customer.customer_name},${customer.customer_mobile},${customer.totalPurchases},${customer.totalAmount.toFixed(2)},${customer.averageOrderValue.toFixed(2)},${new Date(customer.lastPurchase).toLocaleDateString()},${customer.favoriteCategory}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
        </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Report Period</InputLabel>
                <Select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">Last 7 Days</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">This Quarter</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {reportPeriod === 'custom' && (
              <>
                <Grid item xs={12} sm={3} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Start Date</InputLabel>
                    <Select
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                    >
                      {/* Add date options here */}
                    </Select>
                  </FormControl>
            </Grid>
                <Grid item xs={12} sm={3} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>End Date</InputLabel>
                    <Select
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                    >
                      {/* Add date options here */}
                    </Select>
                  </FormControl>
            </Grid>
              </>
            )}

            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadReports}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportCSV}
                  disabled={loading}
                >
                  Export CSV
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
              <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Sales Reports" icon={<BarChart />} />
            <Tab label="Category & Size Analysis" icon={<TrendingUp />} />
            <Tab label="Customer Analysis" icon={<Person />} />
          </Tabs>
        </Box>

                <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Sales Reports Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Sales Performance
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Period</TableCell>
                          <TableCell align="right">Transactions</TableCell>
                          <TableCell align="right">Total Amount</TableCell>
                          <TableCell align="right">Discount</TableCell>
                          <TableCell align="right">Tax</TableCell>
                          <TableCell align="right">Avg Order Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {salesReports.map((report, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {report.period}
                  </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={report.transactionCount} 
                                color="primary" 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(report.totalAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main">
                                -{formatCurrency(report.totalDiscount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(report.totalTax)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(report.averageOrderValue)}
                      </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    </Box>
              )}

              {/* Category & Size Analysis Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Category & Size Performance Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete inventory analysis by category and size. Shows all items with available stock, including sales performance and turnover rates
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell align="right">Quantity Sold</TableCell>
                          <TableCell align="right">Revenue</TableCell>
                          <TableCell align="right">Available Stock</TableCell>
                          <TableCell align="right">Stock Turnover</TableCell>
                          <TableCell align="right">Sales Count</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categorySizeAnalysis.map((analysis, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip 
                                label={`#${index + 1}`} 
                                color={index < 3 ? "primary" : "default"} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={analysis.category} 
                                size="small" 
                                color="primary"
                                variant="outlined" 
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {analysis.size}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                                {analysis.totalQuantitySold}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {formatCurrency(analysis.totalRevenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight="medium"
                                color={analysis.availableStock === 0 ? "error.main" : 
                                       analysis.availableStock < 5 ? "warning.main" : "text.primary"}
                              >
                                {analysis.availableStock}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                fontWeight="medium"
                                color={analysis.stockTurnover > 1 ? "success.main" : 
                                       analysis.stockTurnover > 0.5 ? "warning.main" : "text.secondary"}
                              >
                                {analysis.stockTurnover.toFixed(2)}x
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {analysis.salesCount}
                      </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Summary Cards */}
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="primary">
                            {categorySizeAnalysis.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Category-Size Combinations
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="success.main">
                            {categorySizeAnalysis.reduce((sum, item) => sum + item.totalQuantitySold, 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Items Sold
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="warning.main">
                            {categorySizeAnalysis.filter(item => item.availableStock < 5).length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Low Stock Items
                          </Typography>
                </CardContent>
              </Card>
            </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Card variant="outlined">
                <CardContent>
                          <Typography variant="h6" color="info.main">
                            {categorySizeAnalysis.filter(item => item.stockTurnover > 1).length}
                  </Typography>
                          <Typography variant="body2" color="text.secondary">
                            High Turnover Items
                      </Typography>
                </CardContent>
              </Card>
            </Grid>
                  </Grid>
                </Box>
              )}

              {/* Customer Analysis Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Customer Analysis
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>
                          <TableCell align="right">Total Purchases</TableCell>
                          <TableCell align="right">Total Amount</TableCell>
                          <TableCell align="right">Avg Order Value</TableCell>
                          <TableCell align="right">Last Purchase</TableCell>
                          <TableCell>Favorite Category</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerAnalysis.map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {customer.customer_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {customer.customer_mobile}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Chip
                                label={customer.totalPurchases} 
                                color="primary" 
                                  size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(customer.totalAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(customer.averageOrderValue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {new Date(customer.lastPurchase).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={customer.favoriteCategory} 
                                size="small"
                                variant="outlined" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
                </CardContent>
              </Card>
    </Box>
  );
};

export default Reports;
