import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore, BugReport, CheckCircle, Error } from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';

const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const results: any = {
        timestamp: new Date().toISOString(),
        environment: {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          origin: window.location.origin,
          userAgent: navigator.userAgent
        },
        tests: {}
      };

      // Test 1: Health check
      try {
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
        results.tests.health = {
          status: healthResponse.ok ? 'PASS' : 'FAIL',
          data: healthData,
          statusCode: healthResponse.status
        };
      } catch (err) {
        results.tests.health = {
          status: 'FAIL',
          error: String(err)
        };
      }

      // Test 2: Auth status
      try {
        const authResponse = await fetch('/api/debug/auth');
        const authData = await authResponse.json();
        results.tests.auth = {
          status: authResponse.ok ? 'PASS' : 'FAIL',
          data: authData,
          statusCode: authResponse.status
        };
      } catch (err) {
        results.tests.auth = {
          status: 'FAIL',
          error: String(err)
        };
      }

      // Test 3: Inventory endpoint
      try {
        const inventoryResponse = await fetch('/api/inventory');
        const inventoryData = await inventoryResponse.json();
        results.tests.inventory = {
          status: inventoryResponse.ok ? 'PASS' : 'FAIL',
          data: Array.isArray(inventoryData) ? `${inventoryData.length} items` : inventoryData,
          statusCode: inventoryResponse.status
        };
      } catch (err) {
        results.tests.inventory = {
          status: 'FAIL',
          error: String(err)
        };
      }

      // Test 4: Database service test
      try {
        const inventoryItems = await databaseService.getInventoryItems();
        results.tests.databaseService = {
          status: 'PASS',
          data: `${inventoryItems.length} items retrieved`,
          items: inventoryItems.slice(0, 3).map((item: any) => ({
            id: item.id,
            barcode: item.barcode,
            name: item.style_name
          }))
        };
      } catch (err) {
        results.tests.databaseService = {
          status: 'FAIL',
          error: String(err)
        };
      }

      // Test 5: Barcode lookup test
      try {
        const testBarcode = '1234567890'; // Sample barcode
        const barcodeItem = await databaseService.getInventoryItemByBarcode(testBarcode);
        results.tests.barcodeLookup = {
          status: 'PASS',
          data: barcodeItem ? `Found: ${barcodeItem.style_name}` : 'Not found (expected)',
          barcode: testBarcode
        };
      } catch (err) {
        results.tests.barcodeLookup = {
          status: 'FAIL',
          error: String(err)
        };
      }

      setDebugInfo(results);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle color="success" />;
      case 'FAIL':
        return <Error color="error" />;
      default:
        return <CircularProgress size={16} />;
    }
  };

  const getStatusChip = (status: string) => {
    return (
      <Chip
        icon={getStatusIcon(status)}
        label={status}
        color={status === 'PASS' ? 'success' : status === 'FAIL' ? 'error' : 'default'}
        size="small"
      />
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BugReport sx={{ mr: 1 }} />
            <Typography variant="h6">Debug Panel</Typography>
          </Box>
          
          <Button
            variant="contained"
            onClick={runDiagnostics}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <BugReport />}
            sx={{ mb: 2 }}
          >
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {debugInfo && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Diagnostic Results
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Generated at: {new Date(debugInfo.timestamp).toLocaleString()}
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Environment Info</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(debugInfo.environment, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>

              {Object.entries(debugInfo.tests).map(([testName, testResult]: [string, any]) => (
                <Accordion key={testName}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flexGrow: 1, textTransform: 'capitalize' }}>
                        {testName.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      {getStatusChip(testResult.status)}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DebugPanel;
