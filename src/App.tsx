import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Billing from './components/Billing';
import SalesHistory from './components/SalesHistory';
import FinalBillDone from './components/FinalBillDone';
import CustomerOffers from './components/CustomerOffers';
import Customers from './components/Customers';
import Birthday from './components/Birthday';
import StockAudit from './components/StockAudit';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Layout from './components/Layout';
import DebugPanel from './components/DebugPanel';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true; // Default to dark mode
  });

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontSize: '1rem',
            padding: '8px 16px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="billing" element={<Billing />} />
                <Route path="sales-history" element={
                  <ProtectedRoute adminOnly={true}>
                    <SalesHistory />
                  </ProtectedRoute>
                } />
                <Route path="final-bill-done" element={
                  <ProtectedRoute adminOnly={true}>
                    <FinalBillDone />
                  </ProtectedRoute>
                } />
                <Route path="customer-offers" element={
                  <ProtectedRoute adminOnly={true}>
                    <CustomerOffers />
                  </ProtectedRoute>
                } />
                <Route path="customers" element={
                  <ProtectedRoute adminOnly={true}>
                    <Customers />
                  </ProtectedRoute>
                } />
                <Route path="birthdays" element={
                  <ProtectedRoute adminOnly={true}>
                    <Birthday />
                  </ProtectedRoute>
                } />
                <Route path="stock-audit" element={
                  <ProtectedRoute adminOnly={true}>
                    <StockAudit />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="debug" element={<DebugPanel />} />
              </Route>
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
