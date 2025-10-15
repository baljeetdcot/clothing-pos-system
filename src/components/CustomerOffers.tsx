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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  Edit,
  Visibility,
  CheckCircle,
  Cancel,
  DeleteSweep
} from '@mui/icons-material';
import { databaseService } from '../services/adaptiveDatabase';
import { CustomerOffer } from '../types';

const CustomerOffers: React.FC = () => {
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CustomerOffer | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedOffers, setSelectedOffers] = useState<number[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    customer_mobile: '',
    offer_description: '',
    discount_percentage: 0
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const allOffers = await databaseService.getActiveOffers();
      setOffers(allOffers);
    } catch (err) {
      setError('Failed to load offers');
      console.error('Error loading offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!offerFormData.customer_mobile || !offerFormData.offer_description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Create lifetime offer (no expiry)
      const validFrom = new Date();
      const validUntil = new Date('2099-12-31'); // Set far future date for lifetime validity
      
      await databaseService.createCustomerOffer({
        customer_mobile: offerFormData.customer_mobile,
        offer_type: 'discount',
        offer_description: offerFormData.offer_description,
        discount_percentage: offerFormData.discount_percentage,
        discount_amount: 0,
        bundle_eligible: false,
        enabled_by_cashier: false,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        is_used: false
      });

      await loadOffers();
      setCreateDialogOpen(false);
      setOfferFormData({
        customer_mobile: '',
        offer_description: '',
        discount_percentage: 0
      });
      setSuccess('Offer created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create offer');
      console.error('Error creating offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;

    try {
      setLoading(true);
      await databaseService.deleteOffer(offerId);
      await loadOffers();
      setSuccess('Offer deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete offer');
      console.error('Error deleting offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOffers.length === 0) {
      setError('Please select offers to delete');
      return;
    }

    try {
      setLoading(true);
      for (const offerId of selectedOffers) {
        await databaseService.deleteOffer(offerId);
      }
      await loadOffers();
      setSelectedOffers([]);
      setBulkDeleteDialogOpen(false);
      setSuccess(`${selectedOffers.length} offers deleted successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete offers');
      console.error('Error deleting offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOffer = (offerId: number) => {
    setSelectedOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter((id: number) => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOffers.length === offers.length) {
      setSelectedOffers([]);
    } else {
      setSelectedOffers(offers.map(offer => offer.id));
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, offer: CustomerOffer) => {
    setMenuAnchor(event.currentTarget);
    setSelectedOffer(offer);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedOffer(null);
  };

  const getOfferValue = (offer: CustomerOffer) => {
    if (offer.offer_type === 'discount') {
      return `${offer.discount_percentage}%`;
    } else if (offer.offer_type === 'fixed_discount') {
      return `₹${offer.discount_amount}`;
    } else if (offer.offer_type === 'bundle_discount') {
      if (offer.discount_amount > 0) {
        return `Bundle + ₹${offer.discount_amount} off`;
      } else {
        return `Bundle + ${offer.discount_percentage}%`;
      }
    } else {
      return offer.offer_type.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Customer Offers
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedOffers.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              Delete Selected ({selectedOffers.length})
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Offer
          </Button>
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

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedOffers.length > 0 && selectedOffers.length < offers.length}
                      checked={offers.length > 0 && selectedOffers.length === offers.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Customer Mobile</TableCell>
                  <TableCell>Offer Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Valid Until</TableCell>
                  <TableCell>Enabled By</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">
                        No offers found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedOffers.includes(offer.id)}
                          onChange={() => handleSelectOffer(offer.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {offer.customer_mobile}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {offer.offer_type.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {offer.offer_description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {getOfferValue(offer)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(offer.valid_until).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={offer.enabled_by_cashier ? 'Cashier' : 'Admin'}
                          color={offer.enabled_by_cashier ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, offer)}
                        >
                          <MoreVert />
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

      {/* Create Offer Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Customer Offer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Mobile *"
                value={offerFormData.customer_mobile}
                onChange={(e) => setOfferFormData({ ...offerFormData, customer_mobile: e.target.value })}
                placeholder="Enter 10-digit mobile number"
                inputProps={{ maxLength: 10 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Percentage Discount Offer
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This offer will be applied as a percentage discount on the final bill amount after tier discounts are applied.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Discount Percentage *"
                type="number"
                value={offerFormData.discount_percentage}
                onChange={(e) => {
                  const percentage = parseFloat(e.target.value) || 0;
                  setOfferFormData({ 
                    ...offerFormData, 
                    discount_percentage: percentage,
                    offer_description: percentage > 0 ? `FLAT ${percentage}% off` : ''
                  });
                }}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                helperText="Enter percentage discount (0-100)"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Offer Description *"
                value={offerFormData.offer_description}
                onChange={(e) => setOfferFormData({ ...offerFormData, offer_description: e.target.value })}
                placeholder="Auto-filled based on percentage"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1, 
                color: 'text.primary',
                fontWeight: 'medium' 
              }}>
                <strong>How it works:</strong> Customer offers are now automatically applied after tier discounts. 
                For example: ₹5000 bill → ₹250 tier discount → 10% customer offer on remaining ₹4750 = ₹475 additional discount.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateOffer} 
            variant="contained" 
            disabled={loading || !offerFormData.customer_mobile || !offerFormData.offer_description}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Offer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleDeleteOffer(selectedOffer?.id!);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Bulk Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedOffers.length} selected offer(s)? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerOffers;
