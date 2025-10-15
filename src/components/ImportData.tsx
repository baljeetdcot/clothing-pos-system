import React, { useState, useRef } from 'react';
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
  Divider,
  LinearProgress,
  FormControl,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Upload,
  CloudUpload,
  Inventory,
  ShoppingCart,
  People,
  Settings,
  CheckCircle,
  Error,
  Warning,
  RestoreFromTrash
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';
import { networkDatabaseService } from '../services/networkDatabase';

interface ImportDataProps {
  onClose?: () => void;
}

interface ImportStats {
  inventory: number;
  sales: number;
  users: number;
  settings: number;
  offers: number;
  stockAdjustments: number;
  auditSessions: number;
  finalBills: number;
}

interface ImportOptions {
  overwriteExisting: boolean;
  skipUsers: boolean;
  skipSales: boolean;
  skipSettings: boolean;
}

const ImportData: React.FC<ImportDataProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    skipUsers: false,
    skipSales: false,
    skipSettings: false
  });
  const [importData, setImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCloudMode = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a valid JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate backup format
        if (!data.metadata || !data.data) {
          setError('Invalid backup file format. Please select a valid POS backup file.');
          return;
        }

        const stats: ImportStats = {
          inventory: data.data.inventory?.length || 0,
          sales: data.data.sales?.length || 0,
          users: data.data.users?.length || 0,
          settings: Object.keys(data.data.settings || {}).length,
          offers: data.data.offers?.length || 0,
          stockAdjustments: data.data.stockAdjustments?.length || 0,
          auditSessions: data.data.auditSessions?.length || 0,
          finalBills: data.data.finalBills?.length || 0
        };

        setImportData(data);
        setImportStats(stats);
        setShowPreview(true);
        setError(null);
      } catch (error) {
        console.error('Error parsing backup file:', error);
        setError('Failed to parse backup file. Please ensure it\'s a valid JSON file.');
      }
    };

    reader.readAsText(file);
  };

  const performImport = async () => {
    if (!importData) return;

    try {
      setLoading(true);
      setError(null);
      setImportProgress(0);

      const service = isCloudMode ? networkDatabaseService : databaseService;
      
      // Simulate progress updates for better UX
      const progressSteps = [
        'Preparing import...',
        'Importing inventory items...',
        'Importing sales records...',
        'Importing user accounts...',
        'Importing settings...',
        'Importing customer offers...',
        'Importing stock adjustments...',
        'Importing audit sessions...',
        'Importing final bills...',
        'Finalizing import...'
      ];
      
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setImportStatus(progressSteps[currentStep]);
          setImportProgress((currentStep / progressSteps.length) * 90);
          currentStep++;
        }
      }, 300);

      // Use the bulk import method
      const result = await service.importAllData(importData, importOptions);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Small delay to show 100% completion
      setTimeout(() => {
        setSuccess(true);
        setShowPreview(false);
        console.log('Import completed:', result);
      }, 500);
      
    } catch (error) {
      console.error('Error during import:', error);
      setError('Failed to import data. Please check the backup file and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setSuccess(false);
    setError(null);
    setImportStats(null);
    setImportData(null);
    setImportProgress(0);
    setImportStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose?.();
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CloudUpload sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Import Data</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={3}>
            Restore data from a previous backup. Select a JSON backup file created by the Export Data feature.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Data imported successfully! All data has been restored from the backup.
            </Alert>
          )}

          {loading && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Importing data... {Math.round(importProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={importProgress} />
            </Box>
          )}

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              Select Backup File
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            <strong>Supported formats:</strong> JSON backup files (.json)<br/>
            <strong>Note:</strong> Import will merge data with existing records. Use import options to control behavior.
          </Typography>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The following data will be imported:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Inventory color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Inventory Items" 
                secondary={`${importStats?.inventory || 0} items`}
              />
              <Chip 
                label={importStats?.inventory || 0} 
                color={importStats?.inventory ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ShoppingCart color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sales Records" 
                secondary={`${importStats?.sales || 0} transactions`}
              />
              <Chip 
                label={importStats?.sales || 0} 
                color={importStats?.sales ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <People color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Users" 
                secondary={`${importStats?.users || 0} accounts`}
              />
              <Chip 
                label={importStats?.users || 0} 
                color={importStats?.users ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Settings color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                secondary={`${importStats?.settings || 0} configurations`}
              />
              <Chip 
                label={importStats?.settings || 0} 
                color={importStats?.settings ? 'primary' : 'default'} 
                size="small" 
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Import Options
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.overwriteExisting}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                />
              }
              label="Overwrite existing records"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.skipUsers}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, skipUsers: e.target.checked }))}
                />
              }
              label="Skip users (preserve current user accounts)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.skipSales}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, skipSales: e.target.checked }))}
                />
              }
              label="Skip sales records"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.skipSettings}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, skipSettings: e.target.checked }))}
                />
              }
              label="Skip settings (preserve current configuration)"
            />
          </FormGroup>

          {loading && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {importStatus || 'Importing data...'} {Math.round(importProgress)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={importProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: 'primary.main',
                  }
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Please wait while your data is being imported...
              </Typography>
            </Box>
          )}

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> Importing data will add records to your current database. 
              This action cannot be undone. Make sure you have a current backup before proceeding.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={performImport} 
            variant="contained" 
            startIcon={loading ? <CircularProgress size={20} /> : <RestoreFromTrash />}
            color="warning"
            disabled={loading}
          >
            {loading ? `Importing... ${Math.round(importProgress)}%` : 'Import Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportData;
