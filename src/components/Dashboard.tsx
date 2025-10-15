import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  PointOfSale,
  Assessment
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/adaptiveDatabase';

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  lowStockItems: number;
  totalInventory: number;
  paymentModeBreakdown: {
    cash: number;
    online: number;
    pending: number;
    mixed: number;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    lowStockItems: 0,
    totalInventory: 0,
    paymentModeBreakdown: {
      cash: 0,
      online: 0,
      pending: 0,
      mixed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Get today's sales
      const todaySales = await databaseService.getSalesByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      
      const todaySalesAmount = todaySales.reduce((sum: number, sale: any) => sum + sale.final_amount, 0);
      
      // Calculate payment mode breakdown
      const paymentModeBreakdown = todaySales.reduce((breakdown: any, sale: any) => {
        const paymentMethod = sale.payment_method || 'pending';
        
        if (paymentMethod === 'mixed') {
          // For mixed payments, use the separate cash_amount and online_amount fields
          breakdown.cash = (breakdown.cash || 0) + (sale.cash_amount || 0);
          breakdown.online = (breakdown.online || 0) + (sale.online_amount || 0);
        } else {
          // For single payment methods, use the final_amount
          breakdown[paymentMethod] = (breakdown[paymentMethod] || 0) + sale.final_amount;
        }
        
        return breakdown;
      }, { cash: 0, online: 0, pending: 0, mixed: 0 });
      
      // Get inventory stats
      const inventoryItems = await databaseService.getInventoryItems();
      const lowStockItems = inventoryItems.filter((item: any) => item.stock_quantity < 10).length;
      
      // Get recent sales (last 5)
      const recentSalesData = await databaseService.getSalesByDateRange(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        new Date().toISOString()
      );
      
      setStats({
        todaySales: todaySalesAmount,
        todayTransactions: todaySales.length,
        lowStockItems,
        totalInventory: inventoryItems.length,
        paymentModeBreakdown
      });
      
      setRecentSales(recentSalesData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Box color={color}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.username}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Here's what's happening in your store today.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={`₹${stats.todaySales.toFixed(2)}`}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Transactions"
            value={stats.todayTransactions}
            icon={<PointOfSale sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={<Inventory sx={{ fontSize: 40 }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Inventory"
            value={stats.totalInventory}
            icon={<Assessment sx={{ fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Sales by Payment Mode
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor="primary.main"
                    />
                    <Typography variant="body1">Cash</Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main">
                    ₹{stats.paymentModeBreakdown.cash.toFixed(2)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor="secondary.main"
                    />
                    <Typography variant="body1">Online</Typography>
                  </Box>
                  <Typography variant="h6" color="secondary.main">
                    ₹{stats.paymentModeBreakdown.online.toFixed(2)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor="warning.main"
                    />
                    <Typography variant="body1">Pending</Typography>
                  </Box>
                  <Typography variant="h6" color="warning.main">
                    ₹{stats.paymentModeBreakdown.pending.toFixed(2)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box 
                      width={12} 
                      height={12} 
                      borderRadius="50%" 
                      bgcolor="success.main"
                    />
                    <Typography variant="body1">Mixed</Typography>
                  </Box>
                  <Typography variant="h6" color="success.main">
                    ₹{stats.paymentModeBreakdown.mixed.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1" fontWeight="bold">Total</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      ₹{stats.todaySales.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<PointOfSale />}
                  href="/billing"
                  fullWidth
                  size="large"
                >
                  New Sale
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Inventory />}
                  href="/inventory"
                  fullWidth
                  size="large"
                >
                  Manage Inventory
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assessment />}
                  href="/reports"
                  fullWidth
                  size="large"
                >
                  View Reports
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Sales
              </Typography>
              {recentSales.length > 0 ? (
                <List>
                  {recentSales.map((sale) => (
                    <ListItem key={sale.id} divider>
                      <ListItemText
                        primary={`Sale #${sale.sale_id}`}
                        secondary={`₹${sale.final_amount.toFixed(2)} - ${new Date(sale.created_at).toLocaleString()}`}
                      />
                      <Chip
                        label={sale.payment_method}
                        size="small"
                        color={
                          sale.payment_method === 'cash' ? 'primary' : 
                          sale.payment_method === 'online' ? 'secondary' : 
                          sale.payment_method === 'mixed' ? 'success' : 
                          'warning'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No recent sales found
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
