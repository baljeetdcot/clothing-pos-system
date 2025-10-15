import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import {
  Download,
  CloudDownload,
  Inventory,
  ShoppingCart,
  People,
  Settings,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';
import { networkDatabaseService } from '../services/networkDatabase';
import { InventoryItem } from '../types';

interface ExportDataProps {
  onClose?: () => void;
}

interface ExportStats {
  inventory: number;
  sales: number;
  users: number;
  settings: number;
  offers: number;
  stockAdjustments: number;
  auditSessions: number;
  finalBills: number;
}

const ExportData: React.FC<ExportDataProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isCloudMode = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  const collectAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const service = isCloudMode ? networkDatabaseService : databaseService;

      // Collect all data in parallel
      const [
        inventory,
        sales,
        users,
        settings,
        offers,
        stockAdjustments,
        auditSessions,
        finalBills
      ] = await Promise.all([
        service.getInventoryItems().catch(() => []),
        service.getAllSales().catch(() => []),
        service.getAllUsers().catch(() => []),
        service.getSettings().catch(() => ({})),
        service.getActiveOffers().catch(() => []),
        service.getStockAdjustments().catch(() => []),
        service.getAuditSessions().catch(() => []),
        service.getAllFinalBillStatuses().catch(() => [])
      ]);

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          platform: isCloudMode ? 'cloud' : 'local',
          totalRecords: inventory.length + sales.length + users.length + Object.keys(settings).length + offers.length + stockAdjustments.length + auditSessions.length + finalBills.length
        },
        data: {
          inventory,
          sales,
          users,
          settings,
          offers,
          stockAdjustments,
          auditSessions,
          finalBills
        }
      };

      const stats: ExportStats = {
        inventory: inventory.length,
        sales: sales.length,
        users: users.length,
        settings: Object.keys(settings).length,
        offers: offers.length,
        stockAdjustments: stockAdjustments.length,
        auditSessions: auditSessions.length,
        finalBills: finalBills.length
      };

      setExportStats(stats);
      setShowPreview(true);

      return exportData;
    } catch (error) {
      console.error('Error collecting data:', error);
      setError('Failed to collect data for export. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async () => {
    const exportData = await collectAllData();
    if (!exportData) return;

    try {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setShowPreview(false);
    } catch (error) {
      console.error('Error downloading export:', error);
      setError('Failed to download export file. Please try again.');
    }
  };

  const downloadCSV = async () => {
    const exportData = await collectAllData();
    if (!exportData) return;

    try {
      // Create CSV for inventory
      const inventoryCSV = [
        ['ID', 'Sub Section', 'Style Name', 'Color', 'Size', 'Item Code', 'Style', 'Category', 'Design', 'Barcode', 'Stock', 'Created At'],
        ...exportData.data.inventory.map((item: InventoryItem) => [
          item.id,
          item.sub_section_name || '',
          item.style_name || '',
          item.color_name || '',
          item.size || '',
          item.item_code,
          item.style || '',
          item.category || '',
          item.design || '',
          item.barcode || '',
          item.stock_quantity || 0,
          item.created_at || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const csvBlob = new Blob([inventoryCSV], { type: 'text/csv' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-inventory-${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setShowPreview(false);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      setError('Failed to download CSV file. Please try again.');
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setSuccess(false);
    setError(null);
    setExportStats(null);
    onClose?.();
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CloudDownload sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Export Data</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={3}>
            Create a backup of all your POS data including inventory, sales, users, and settings. 
            This backup can be used to restore data on another system or as a safety backup.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Data exported successfully! The file has been downloaded to your device.
            </Alert>
          )}

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Download />}
              onClick={downloadExport}
              disabled={loading}
            >
              Export All Data (JSON)
            </Button>

            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={20} /> : <Inventory />}
              onClick={downloadCSV}
              disabled={loading}
            >
              Export Inventory (CSV)
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            <strong>JSON Export:</strong> Complete backup including all data types<br/>
            <strong>CSV Export:</strong> Inventory data only, compatible with Excel
          </Typography>
        </CardContent>
      </Card>

      {/* Export Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Export Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The following data will be exported:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Inventory color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Inventory Items" 
                secondary={`${exportStats?.inventory || 0} items`}
              />
              <Chip 
                label={exportStats?.inventory || 0} 
                color={exportStats?.inventory ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ShoppingCart color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sales Records" 
                secondary={`${exportStats?.sales || 0} transactions`}
              />
              <Chip 
                label={exportStats?.sales || 0} 
                color={exportStats?.sales ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <People color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Users" 
                secondary={`${exportStats?.users || 0} accounts`}
              />
              <Chip 
                label={exportStats?.users || 0} 
                color={exportStats?.users ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Settings color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                secondary={`${exportStats?.settings || 0} configurations`}
              />
              <Chip 
                label={exportStats?.settings || 0} 
                color={exportStats?.settings ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <Divider sx={{ my: 1 }} />

            <ListItem>
              <ListItemText 
                primary="Customer Offers" 
                secondary={`${exportStats?.offers || 0} offers`}
              />
              <Chip 
                label={exportStats?.offers || 0} 
                color={exportStats?.offers ? 'secondary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemText 
                primary="Stock Adjustments" 
                secondary={`${exportStats?.stockAdjustments || 0} adjustments`}
              />
              <Chip 
                label={exportStats?.stockAdjustments || 0} 
                color={exportStats?.stockAdjustments ? 'secondary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemText 
                primary="Audit Sessions" 
                secondary={`${exportStats?.auditSessions || 0} sessions`}
              />
              <Chip 
                label={exportStats?.auditSessions || 0} 
                color={exportStats?.auditSessions ? 'secondary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemText 
                primary="Final Bills" 
                secondary={`${exportStats?.finalBills || 0} bills`}
              />
              <Chip 
                label={exportStats?.finalBills || 0} 
                color={exportStats?.finalBills ? 'secondary' : 'default'} 
                size="small" 
              />
            </ListItem>
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Total Records:</strong> {exportStats ? 
                exportStats.inventory + exportStats.sales + exportStats.users + 
                exportStats.settings + exportStats.offers + exportStats.stockAdjustments + 
                exportStats.auditSessions + exportStats.finalBills : 0}
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button onClick={downloadExport} variant="contained" startIcon={<Download />}>
            Download Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExportData;
