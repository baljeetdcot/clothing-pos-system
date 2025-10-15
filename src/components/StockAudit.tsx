import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  InputAdornment,
  TablePagination
} from '@mui/material';
import {
  Search,
  Edit,
  Save,
  Cancel,
  Inventory,
  TrendingUp,
  TrendingDown,
  Warning,
  Pause,
  PlayArrow,
  Stop,
  Download
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';
import { InventoryItem } from '../types';

interface StockAdjustment {
  id: number;
  item_id: number;
  item_code: string;
  style_name: string;
  previous_quantity: number;
  adjusted_quantity: number;
  difference: number;
  reason: string;
  adjusted_by: string;
  adjusted_at: string;
}

const StockAudit: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustedQuantity, setAdjustedQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showAdjustmentHistory, setShowAdjustmentHistory] = useState(false);
  const [auditMode, setAuditMode] = useState<'view' | 'scan' | 'paused'>('view');
  const [scannedBarcodes, setScannedBarcodes] = useState<Map<string, number>>(new Map());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [auditResults, setAuditResults] = useState<Array<{
    item: InventoryItem;
    systemQuantity: number;
    scannedQuantity: number;
    difference: number;
  }>>([]);
  const [auditSession, setAuditSession] = useState<{
    startTime: Date | null;
    pauseTime: Date | null;
    totalPauseTime: number;
    isPaused: boolean;
  }>({
    startTime: null,
    pauseTime: null,
    totalPauseTime: 0,
    isPaused: false
  });
  const [currentAuditSessionId, setCurrentAuditSessionId] = useState<number | null>(null);
  const [savedAuditSessions, setSavedAuditSessions] = useState<any[]>([]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  useEffect(() => {
    loadInventory();
    loadStockAdjustments();
    loadSavedAuditSessions();
    loadAuditHistory();
  }, []);

  // Check for resumable audit sessions on component mount
  useEffect(() => {
    const checkForResumableSessions = async () => {
      try {
        const sessions = await databaseService.getAuditSessions();
        const activeSessions = sessions.filter((session: any) => 
          session.audit_mode === 'scan' || session.audit_mode === 'paused'
        );
        
        if (activeSessions.length > 0) {
          setSavedAuditSessions(activeSessions);
          setShowResumeDialog(true);
        }
      } catch (error) {
        console.error('Error checking for resumable sessions:', error);
      }
    };

    checkForResumableSessions();
  }, []);

  // Update duration timer every second when audit is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (auditMode === 'scan' || auditMode === 'paused') {
      interval = setInterval(() => {
        // Force re-render to update duration display
        setAuditSession(prev => ({ ...prev }));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [auditMode]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const items = await databaseService.getInventoryItems();
      setInventory(items);
    } catch (err) {
      setError('Failed to load inventory');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStockAdjustments = async () => {
    try {
      const adjustments = await databaseService.getStockAdjustments();
      setStockAdjustments(adjustments);
    } catch (err) {
      console.error('Error loading stock adjustments:', err);
    }
  };

  const loadSavedAuditSessions = async () => {
    try {
      const sessions = await databaseService.getAuditSessions();
      setSavedAuditSessions(sessions);
    } catch (err) {
      console.error('Error loading saved audit sessions:', err);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const sessions = await databaseService.getAuditSessions();
      const completedSessions = sessions.filter((session: any) => 
        session.audit_mode === 'completed'
      );
      setAuditHistory(completedSessions);
    } catch (err) {
      console.error('Error loading audit history:', err);
    }
  };

  const saveAuditSession = async (sessionName?: string) => {
    if (!currentAuditSessionId && (auditMode === 'scan' || auditMode === 'paused')) {
      try {
        const sessionData = {
          sessionName: sessionName || `Audit Session ${new Date().toLocaleString()}`,
          auditMode: auditMode,
          startTime: auditSession.startTime?.toISOString() || new Date().toISOString(),
          pauseTime: auditSession.pauseTime?.toISOString(),
          totalPauseTime: auditSession.totalPauseTime,
          isPaused: auditSession.isPaused,
          scannedData: Object.fromEntries(scannedBarcodes)
        };

        const sessionId = await databaseService.createAuditSession(sessionData);
        setCurrentAuditSessionId(sessionId);
        setSuccess('Audit session saved successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error saving audit session:', error);
        setError('Failed to save audit session');
      }
    } else if (currentAuditSessionId) {
      try {
        await databaseService.updateAuditSession(currentAuditSessionId, {
          auditMode: auditMode,
          pauseTime: auditSession.pauseTime?.toISOString(),
          totalPauseTime: auditSession.totalPauseTime,
          isPaused: auditSession.isPaused,
          scannedData: Object.fromEntries(scannedBarcodes)
        });
      } catch (error) {
        console.error('Error updating audit session:', error);
      }
    }
  };

  const handleAdjustment = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustedQuantity(item.stock_quantity.toString());
    setAdjustmentReason('');
    setAdjustmentDialogOpen(true);
  };


  const handleAdjustmentConfirm = async () => {
    if (!selectedItem || !adjustedQuantity || !adjustmentReason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const newQuantity = parseInt(adjustedQuantity);
    if (isNaN(newQuantity) || newQuantity < 0) {
      setError('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Record the stock adjustment
      await databaseService.createStockAdjustment({
        item_id: selectedItem.id,
        item_code: selectedItem.item_code,
        style_name: selectedItem.style_name,
        previous_quantity: selectedItem.stock_quantity,
        adjusted_quantity: newQuantity,
        difference: newQuantity - selectedItem.stock_quantity,
        reason: adjustmentReason,
        adjusted_by: 'admin', // TODO: Get from auth context
        adjusted_at: new Date().toISOString()
      });

      // Update the inventory item
      await databaseService.updateInventoryItem(selectedItem.id, {
        ...selectedItem,
        stock_quantity: newQuantity
      });

      await loadInventory();
      await loadStockAdjustments();
      setAdjustmentDialogOpen(false);
      setSuccess('Stock adjustment recorded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to adjust stock');
      console.error('Error adjusting stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    setAuditMode('scan');
    setScannedBarcodes(new Map());
    setAuditResults([]);
    setBarcodeInput('');
    setAuditSession({
      startTime: new Date(),
      pauseTime: null,
      totalPauseTime: 0,
      isPaused: false
    });
    setCurrentAuditSessionId(null);
    setSuccess('Scanning mode started. Scan barcodes to count physical inventory.');
    setTimeout(() => setSuccess(''), 3000);
    
    // Auto-save session after a short delay
    setTimeout(() => {
      saveAuditSession();
    }, 1000);
  };

  const pauseScanning = async () => {
    setAuditMode('paused');
    setAuditSession(prev => ({
      ...prev,
      pauseTime: new Date(),
      isPaused: true
    }));
    setSuccess('Audit paused. You can resume anytime.');
    setTimeout(() => setSuccess(''), 3000);
    
    // Save the paused state
    setTimeout(() => {
      saveAuditSession();
    }, 500);
  };

  const resumeScanning = async () => {
    setAuditMode('scan');
    setAuditSession(prev => ({
      ...prev,
      pauseTime: null,
      totalPauseTime: prev.totalPauseTime + (prev.pauseTime ? Date.now() - prev.pauseTime.getTime() : 0),
      isPaused: false
    }));
    setSuccess('Audit resumed. Continue scanning barcodes.');
    setTimeout(() => setSuccess(''), 3000);
    
    // Save the resumed state
    setTimeout(() => {
      saveAuditSession();
    }, 500);
  };

  const endScanning = async () => {
    setAuditMode('view');
    setAuditSession({
      startTime: null,
      pauseTime: null,
      totalPauseTime: 0,
      isPaused: false
    });
    
    // Auto-generate comparison and export report if items were scanned
    if (scannedBarcodes.size > 0) {
      generateComparison();
      setTimeout(() => {
        exportAuditReport();
      }, 1000);
      setSuccess('Scanning completed. Comparison generated and report exported automatically.');
    } else {
      setSuccess('Scanning completed. No items were scanned.');
    }
    setTimeout(() => setSuccess(''), 5000);
    
    // Save completed audit to history instead of deleting
    if (currentAuditSessionId && scannedBarcodes.size > 0) {
      try {
        await databaseService.updateAuditSession(currentAuditSessionId, {
          auditMode: 'completed',
          scannedData: Object.fromEntries(scannedBarcodes)
        });
        await loadAuditHistory();
        await loadSavedAuditSessions(); // Refresh the saved sessions list
      } catch (error) {
        console.error('Error saving completed audit to history:', error);
        // If update fails, try to delete the session to prevent resume dialog
        try {
          await databaseService.deleteAuditSession(currentAuditSessionId);
          await loadSavedAuditSessions(); // Refresh the saved sessions list
        } catch (deleteError) {
          console.error('Error deleting audit session:', deleteError);
        }
      }
    } else if (currentAuditSessionId) {
      // If no items were scanned, delete the session
      try {
        await databaseService.deleteAuditSession(currentAuditSessionId);
        await loadSavedAuditSessions(); // Refresh the saved sessions list
      } catch (error) {
        console.error('Error deleting empty audit session:', error);
      }
    }
    
    setCurrentAuditSessionId(null);
  };

  const resumeAuditSession = async (session: any) => {
    try {
      setAuditMode(session.audit_mode);
      setScannedBarcodes(new Map(Object.entries(session.scannedData)));
      setAuditSession({
        startTime: new Date(session.start_time),
        pauseTime: session.pause_time ? new Date(session.pause_time) : null,
        totalPauseTime: session.total_pause_time,
        isPaused: session.is_paused
      });
      setCurrentAuditSessionId(session.id);
      setShowResumeDialog(false);
      setSuccess(`Resumed audit session: ${session.session_name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error resuming audit session:', error);
      setError('Failed to resume audit session');
    }
  };

  const startNewAudit = () => {
    setShowResumeDialog(false);
    setSavedAuditSessions([]);
  };

  const downloadAuditReport = (session: any) => {
    try {
      // Generate audit results from session data
      const results: Array<{
        item: InventoryItem;
        systemQuantity: number;
        scannedQuantity: number;
        difference: number;
      }> = [];

      inventory.forEach(item => {
        const scannedCount = session.scannedData[item.barcode] || 0;
        const difference = scannedCount - item.stock_quantity;
        
        results.push({
          item,
          systemQuantity: item.stock_quantity,
          scannedQuantity: scannedCount,
          difference
        });
      });

      // Prepare data for Excel export
      const exportData = results.map(result => ({
        'Item Code': result.item.item_code,
        'Style Name': result.item.style_name,
        'Color': result.item.color_name,
        'Size': result.item.size,
        'Barcode': result.item.barcode,
        'Category': result.item.category,
        'Sub Section': result.item.sub_section_name,
        'Style': result.item.style,
        'Design': result.item.design,
        'System Quantity': result.systemQuantity,
        'Scanned Quantity': result.scannedQuantity,
        'Difference': result.difference,
        'Status': result.difference === 0 ? 'Match' : result.difference > 0 ? 'Extra Found' : 'Missing'
      }));

      // Create CSV content
      const headers = [
        'Item Code', 'Style Name', 'Color', 'Size', 'Barcode', 'Category', 
        'Sub Section', 'Style', 'Design', 'System Quantity', 'Scanned Quantity', 
        'Difference', 'Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with session name and timestamp
      const sessionDate = new Date(session.start_time).toISOString().slice(0, 19).replace(/:/g, '-');
      link.setAttribute('download', `Audit_Report_${session.session_name.replace(/[^a-zA-Z0-9]/g, '_')}_${sessionDate}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Audit report downloaded: ${session.session_name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to download audit report');
      console.error('Error downloading audit report:', err);
    }
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      setError('');
      
      // Find item by barcode
      const item = await databaseService.getInventoryItemByBarcode(barcodeInput.trim());
      if (!item) {
        setError(`Item with barcode ${barcodeInput.trim()} not found in inventory`);
        return;
      }

      // Add to scanned barcodes (increment count if already scanned)
      const newScannedBarcodes = new Map(scannedBarcodes);
      const currentCount = newScannedBarcodes.get(item.barcode) || 0;
      newScannedBarcodes.set(item.barcode, currentCount + 1);
      setScannedBarcodes(newScannedBarcodes);

      setBarcodeInput('');
      setSuccess(`Scanned: ${item.style_name} - ${item.color_name} (${item.size})`);
      setTimeout(() => setSuccess(''), 2000);
      
      // Save the updated scan data
      setTimeout(() => {
        saveAuditSession();
      }, 100);
    } catch (err) {
      setError('Error scanning barcode');
      console.error('Error scanning barcode:', err);
    }
  };

  const generateComparison = () => {
    const results: Array<{
      item: InventoryItem;
      systemQuantity: number;
      scannedQuantity: number;
      difference: number;
    }> = [];

    // Check all inventory items
    inventory.forEach(item => {
      const scannedCount = scannedBarcodes.get(item.barcode) || 0;
      const difference = scannedCount - item.stock_quantity;
      
      results.push({
        item,
        systemQuantity: item.stock_quantity,
        scannedQuantity: scannedCount,
        difference
      });
    });

    setAuditResults(results);
    setSuccess(`Comparison generated. Found ${results.filter((r: any) => r.difference !== 0).length} discrepancies.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const exportAuditReport = () => {
    if (auditResults.length === 0) {
      setError('No audit data to export. Please generate comparison first.');
      return;
    }

    try {
      // Prepare data for Excel export
      const exportData = auditResults.map(result => ({
        'Item Code': result.item.item_code,
        'Style Name': result.item.style_name,
        'Color': result.item.color_name,
        'Size': result.item.size,
        'Barcode': result.item.barcode,
        'Category': result.item.category,
        'Sub Section': result.item.sub_section_name,
        'Style': result.item.style,
        'Design': result.item.design,
        'System Quantity': result.systemQuantity,
        'Scanned Quantity': result.scannedQuantity,
        'Difference': result.difference,
        'Status': result.difference === 0 ? 'Match' : result.difference > 0 ? 'Extra Found' : 'Missing'
      }));

      // Create CSV content
      const headers = [
        'Item Code', 'Style Name', 'Color', 'Size', 'Barcode', 'Category', 
        'Sub Section', 'Style', 'Design', 'System Quantity', 'Scanned Quantity', 
        'Difference', 'Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      link.setAttribute('download', `Stock_Audit_Report_${timestamp}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('Audit report exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to export audit report');
      console.error('Error exporting audit report:', err);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.style_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.includes(searchTerm)
  );

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return 'success';
    if (difference < 0) return 'error';
    return 'default';
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp />;
    if (difference < 0) return <TrendingDown />;
    return undefined;
  };

  const getAuditDuration = () => {
    if (!auditSession.startTime) return '0:00';
    
    const now = new Date();
    const totalElapsed = now.getTime() - auditSession.startTime.getTime();
    const activeTime = totalElapsed - auditSession.totalPauseTime - (auditSession.isPaused && auditSession.pauseTime ? now.getTime() - auditSession.pauseTime.getTime() : 0);
    
    const minutes = Math.floor(activeTime / 60000);
    const seconds = Math.floor((activeTime % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Stock Audit
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {auditMode === 'view' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={startScanning}
                startIcon={<Inventory />}
              >
                Start Barcode Scan
              </Button>
              {scannedBarcodes.size > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={generateComparison}
                  startIcon={<TrendingUp />}
                >
                  Generate Comparison
                </Button>
              )}
            </Box>
          ) : auditMode === 'scan' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={pauseScanning}
                startIcon={<Pause />}
              >
                Pause Audit
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => saveAuditSession()}
                startIcon={<Save />}
              >
                Save Session
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={endScanning}
                startIcon={<Stop />}
              >
                End Scanning
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                onClick={resumeScanning}
                startIcon={<PlayArrow />}
              >
                Resume Audit
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => saveAuditSession()}
                startIcon={<Save />}
              >
                Save Session
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={endScanning}
                startIcon={<Stop />}
              >
                End Scanning
              </Button>
            </Box>
          )}
          <Button
            variant={showAdjustmentHistory ? "contained" : "outlined"}
            onClick={() => setShowAdjustmentHistory(!showAdjustmentHistory)}
            startIcon={<Inventory />}
          >
            {showAdjustmentHistory ? 'Hide History' : 'Show History'}
          </Button>
          <Button
            variant={showAuditHistory ? "contained" : "outlined"}
            onClick={() => setShowAuditHistory(!showAuditHistory)}
            startIcon={<TrendingUp />}
          >
            {showAuditHistory ? 'Hide Audit History' : 'Show Audit History'}
          </Button>
          <Chip
            icon={<Inventory />}
            label={`${inventory.length} Items`}
            color="primary"
            variant="outlined"
          />
          {(auditMode === 'scan' || auditMode === 'paused') && (
            <>
              <Chip
                label={`${scannedBarcodes.size} Unique Scanned`}
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Duration: ${getAuditDuration()}`}
                color={auditMode === 'paused' ? 'warning' : 'info'}
                variant="outlined"
              />
            </>
          )}
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

      {/* Barcode Scanning Interface */}
      {(auditMode === 'scan' || auditMode === 'paused') && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {auditMode === 'scan' ? 'Scan Barcodes' : 'Audit Paused'}
            </Typography>
            {auditMode === 'scan' ? (
              <>
                <Box component="form" onSubmit={handleBarcodeScan} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    placeholder="Scan or enter barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    autoFocus
                  />
                  <Button type="submit" variant="contained" disabled={!barcodeInput.trim()}>
                    Scan
                  </Button>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={generateComparison}
                    disabled={scannedBarcodes.size === 0}
                  >
                    Generate Comparison
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Scanned {Array.from(scannedBarcodes.values()).reduce((sum, count) => sum + count, 0)} items total
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Audit is currently paused. Click "Resume Audit" to continue scanning.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Scanned: {scannedBarcodes.size} unique items
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {getAuditDuration()}
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by item code, style name, or barcode..."
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

      {/* Inventory Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Code</TableCell>
                  <TableCell>Style Name</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Barcode</TableCell>
                  <TableCell align="right">Current Stock</TableCell>
                  {(auditMode === 'scan' || auditMode === 'paused') && <TableCell align="center">Scanned Count</TableCell>}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={(auditMode === 'scan' || auditMode === 'paused') ? 8 : 7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(auditMode === 'scan' || auditMode === 'paused') ? 8 : 7} align="center">
                      <Typography color="text.secondary">
                        No items found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {item.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.style_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.color_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.size}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {item.barcode}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {item.stock_quantity}
                            </Typography>
                            {item.stock_quantity === 0 && (
                              <Warning color="error" fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        {(auditMode === 'scan' || auditMode === 'paused') && (
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {scannedBarcodes.get(item.barcode) || 0}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleAdjustment(item)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={filteredInventory.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Scan Comparison Results */}
      {auditResults.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Scan Comparison Results
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={exportAuditReport}
                disabled={loading}
                startIcon={<Save />}
              >
                Export Audit Report (Excel)
              </Button>
            </Box>
            
            {/* Audit Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Total Items: ${auditResults.length}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Perfect Matches: ${auditResults.filter((r: any) => r.difference === 0).length}`} 
                color="success" 
                variant="outlined" 
              />
              <Chip 
                label={`Missing Items: ${auditResults.filter((r: any) => r.difference < 0).length}`} 
                color="error" 
                variant="outlined" 
              />
              <Chip 
                label={`Extra Items: ${auditResults.filter((r: any) => r.difference > 0).length}`} 
                color="warning" 
                variant="outlined" 
              />
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Code</TableCell>
                    <TableCell>Style Name</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell align="right">System Qty</TableCell>
                    <TableCell align="right">Scanned Qty</TableCell>
                    <TableCell align="center">Difference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditResults.map((result) => (
                    <TableRow key={result.item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {result.item.item_code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {result.item.style_name} - {result.item.color_name} ({result.item.size})
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {result.item.barcode}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {result.systemQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {result.scannedQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {result.difference !== 0 ? (
                          <Chip
                            {...(getDifferenceIcon(result.difference) && { icon: getDifferenceIcon(result.difference) })}
                            label={result.difference > 0 ? `+${result.difference}` : result.difference}
                            color={getDifferenceColor(result.difference)}
                            size="small"
                          />
                        ) : (
                          <Chip label="✓ Match" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Stock Adjustment History */}
      {showAdjustmentHistory && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Stock Adjustment History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Item Code</TableCell>
                    <TableCell>Style Name</TableCell>
                    <TableCell align="right">Previous</TableCell>
                    <TableCell align="right">Adjusted</TableCell>
                    <TableCell align="center">Difference</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Adjusted By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockAdjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No stock adjustments recorded
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockAdjustments.map((adjustment) => (
                      <TableRow key={adjustment.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(adjustment.adjusted_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(adjustment.adjusted_at).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {adjustment.item_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {adjustment.style_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {adjustment.previous_quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {adjustment.adjusted_quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            {...(getDifferenceIcon(adjustment.difference) && { icon: getDifferenceIcon(adjustment.difference) })}
                            label={adjustment.difference > 0 ? `+${adjustment.difference}` : adjustment.difference}
                            color={getDifferenceColor(adjustment.difference)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {adjustment.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {adjustment.adjusted_by}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      {showAuditHistory && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Audit History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Session Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Items Scanned</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          No completed audits found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditHistory.map((session) => (
                      <TableRow key={session.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {session.session_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(session.start_time).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(session.start_time).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {Object.keys(session.scannedData).length} unique items
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {session.total_pause_time > 0 ? 
                              `${Math.floor((Date.now() - new Date(session.start_time).getTime() - session.total_pause_time) / 60000)} min` :
                              `${Math.floor((Date.now() - new Date(session.start_time).getTime()) / 60000)} min`
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="Completed"
                            color="success"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => downloadAuditReport(session)}
                            startIcon={<Download />}
                          >
                            Download Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock Quantity</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Item Details
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {selectedItem?.style_name} - {selectedItem?.color_name} ({selectedItem?.size})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Code: {selectedItem?.item_code} | Barcode: {selectedItem?.barcode}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Current Stock: {selectedItem?.stock_quantity}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Stock Quantity"
                type="number"
                value={adjustedQuantity}
                onChange={(e) => setAdjustedQuantity(e.target.value)}
                inputProps={{ min: 0 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for Adjustment"
                multiline
                rows={3}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Physical count discrepancy, damaged goods, theft, etc."
                required
              />
            </Grid>
            {adjustedQuantity && !isNaN(parseInt(adjustedQuantity)) && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Difference:
                  </Typography>
                  <Chip
                    {...(getDifferenceIcon(parseInt(adjustedQuantity) - (selectedItem?.stock_quantity || 0)) && { icon: getDifferenceIcon(parseInt(adjustedQuantity) - (selectedItem?.stock_quantity || 0)) })}
                    label={`${parseInt(adjustedQuantity) - (selectedItem?.stock_quantity || 0)}`}
                    color={getDifferenceColor(parseInt(adjustedQuantity) - (selectedItem?.stock_quantity || 0))}
                    size="small"
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAdjustmentConfirm} 
            variant="contained" 
            disabled={loading || !adjustedQuantity || !adjustmentReason.trim()}
            startIcon={<Save />}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resume Audit Dialog */}
      <Dialog open={showResumeDialog} onClose={() => setShowResumeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Resume Previous Audit Session</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You have {savedAuditSessions.length} previous audit session(s) that can be resumed:
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Session Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Items Scanned</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {savedAuditSessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {session.session_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.audit_mode === 'scan' ? 'Active' : 'Paused'}
                        color={session.audit_mode === 'scan' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {Object.keys(session.scannedData).length} unique items
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(session.start_time).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => resumeAuditSession(session)}
                        startIcon={<PlayArrow />}
                      >
                        Resume
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={startNewAudit} variant="outlined">
            Start New Audit
          </Button>
          <Button onClick={() => setShowResumeDialog(false)} variant="contained">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default StockAudit;
