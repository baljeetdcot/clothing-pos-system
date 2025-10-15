import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';
import {
  Save,
  Add,
  Edit,
  Delete,
  PersonAdd,
  Security,
  Lock
} from '@mui/icons-material';
import { Settings as AppSettings, User } from '../types';
import { databaseService } from '../services/adaptiveDatabase';
import { useAuth } from '../contexts/AuthContext';
import ChangePassword from './ChangePassword';
import ExportData from './ExportData';
import ImportData from './ImportData';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    store_name: '',
    store_address: '',
    contact_number: '',
    gstin: '',
    tax_rate: 18,
    receipt_footer: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier'
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadSettings();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const appSettings = await databaseService.getSettings();
      setSettings(appSettings);
    } catch (err) {
      setError('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await databaseService.getAllUsers();
      setUsers(usersData);
    } catch (err) {
      setError('Error loading users');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await databaseService.updateSettings(settings);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      setError('Username and password are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await databaseService.createUser(newUser.username, newUser.password, newUser.role);
      setNewUser({ username: '', password: '', role: 'cashier' });
      setUserDialogOpen(false);
      await loadUsers();
      setSuccess('User created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error creating user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === user?.id) {
      setError('Cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await databaseService.deleteUser(userId);
      await loadUsers();
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error deleting user');
    }
  };

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
        Settings
      </Typography>

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

      <Grid container spacing={3}>
        {/* Store Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Store Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Name"
                    value={settings.store_name}
                    onChange={(e) => setSettings({...settings, store_name: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Address"
                    value={settings.store_address}
                    onChange={(e) => setSettings({...settings, store_address: e.target.value})}
                    multiline
                    rows={3}
                    placeholder="Enter your store's complete address"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contact Number"
                    value={settings.contact_number}
                    onChange={(e) => setSettings({...settings, contact_number: e.target.value})}
                    placeholder="Enter store contact number"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="GSTIN Number"
                    value={settings.gstin}
                    onChange={(e) => setSettings({...settings, gstin: e.target.value})}
                    placeholder="Optional"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tax Rate (%)"
                    type="number"
                    value={settings.tax_rate}
                    onChange={(e) => setSettings({...settings, tax_rate: parseFloat(e.target.value) || 0})}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Receipt Footer"
                    multiline
                    rows={3}
                    value={settings.receipt_footer}
                    onChange={(e) => setSettings({...settings, receipt_footer: e.target.value})}
                    placeholder="Thank you for your business!"
                  />
                </Grid>
              </Grid>
              <Box mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'Save Settings'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management */}
        {isAdmin && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    User Management
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setUserDialogOpen(true)}
                  >
                    Add User
                  </Button>
                </Box>
                <List>
                  {users.map((userItem) => (
                    <ListItem key={userItem.id} divider>
                      <ListItemText
                        primary={userItem.username}
                        secondary={`Role: ${userItem.role} • Created: ${new Date(userItem.created_at).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteUser(userItem.id)}
                          disabled={userItem.id === user?.id}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Password Change */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Change Password
                </Typography>
                <Lock color="primary" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Update your account password for security
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Lock />}
                onClick={() => setPasswordDialogOpen(true)}
                fullWidth
              >
                Change My Password
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Pricing Rules */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pricing Rules
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Current pricing rules are configured in the system. These can be modified by editing the pricing service.
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Rules (All prices inclusive of 5% GST):
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Denim: 1 @ ₹999, 3 @ ₹2499</li>
                  <li>T-shirt: 1 @ ₹499, 3 @ ₹1199</li>
                  <li>Shirt: 1 @ ₹699, 3 @ ₹1699</li>
                  <li>Trouser (Formal): 1 @ ₹699, 3 @ ₹1699</li>
                  <li>Trouser (Casual): 1 @ ₹849, 3 @ ₹2199</li>
                </Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Discount Tiers:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Total &gt; ₹3000 → ₹250 off</li>
                  <li>Total &gt; ₹5000 → ₹500 off</li>
                  <li>Total &gt; ₹7000 → ₹750 off</li>
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Export/Import */}
        <Grid item xs={12} md={6}>
          <ExportData />
        </Grid>

        <Grid item xs={12} md={6}>
          <ImportData />
        </Grid>
      </Grid>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Role"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'cashier'})}
              >
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePassword 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)} 
      />
    </Box>
  );
};

export default Settings;
