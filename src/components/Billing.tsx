import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  Paper,
  InputAdornment,
  CircularProgress,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  QrCodeScanner,
  Receipt,
  Print,
  Save,
  LocalOffer,
  CheckCircle
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../services/adaptiveDatabase';
import { ReceiptService } from '../services/receiptService';
import { PricingService } from '../services/pricing';
import { InventoryItem, CustomerOffer } from '../types/index';

const Billing: React.FC = () => {
  const { cartItems, customerOffers, oneTimeDiscount, addToCart, removeFromCart, updateQuantity, updateItemPrice, clearCart, setCustomerOffers, setOneTimeDiscount, getCartTotal } = useCart();
  const { user } = useAuth();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerDOB, setCustomerDOB] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'mixed' | 'pending'>('cash');
  const [manualItemDialog, setManualItemDialog] = useState(false);
  const [manualItemCode, setManualItemCode] = useState('');
  const [priceOverrideDialog, setPriceOverrideDialog] = useState(false);
  const [selectedItemForPriceOverride, setSelectedItemForPriceOverride] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    offer_description: '',
    discount_percentage: 0
  });
  const [enableBundleCarryforward, setEnableBundleCarryforward] = useState(false);
  const [printConfirmationDialog, setPrintConfirmationDialog] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [printAttempted, setPrintAttempted] = useState(false);
  const [oneTimeDiscountInput, setOneTimeDiscountInput] = useState('');
  const [cashPaymentDialog, setCashPaymentDialog] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [mixedPaymentDialog, setMixedPaymentDialog] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const cartTotal = getCartTotal();
  
  // Calculate round-off amount (round to nearest rupee)
  const roundOffAmount = Math.round(cartTotal.total) - cartTotal.total;
  const finalAmount = Math.round(cartTotal.total);

  // Calculate change for cash payment
  const calculateChange = () => {
    const tendered = parseFloat(cashTendered) || 0;
    return tendered - finalAmount;
  };

  // Calculate mixed payment totals
  const calculateMixedTotals = () => {
    const cash = parseFloat(cashAmount) || 0;
    const online = parseFloat(onlineAmount) || 0;
    const total = cash + online;
    return { cash, online, total, remaining: finalAmount - total };
  };

  // Focus barcode input on component mount
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Helper function to refocus barcode input with multiple attempts
  const refocusBarcodeInput = () => {
    // Clear React state immediately
    setBarcodeInput('');
    
    // Method 1: Instant focus - no delay
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
      barcodeInputRef.current.value = '';
      barcodeInputRef.current.select(); // Select all text to highlight it
    }
    
    // Method 2: Immediate backup focus
    setTimeout(() => {
      if (barcodeInputRef.current) {
        setBarcodeInput('');
        barcodeInputRef.current.focus();
        barcodeInputRef.current.value = '';
        barcodeInputRef.current.select();
      }
    }, 10); // Very short delay
    
    // Method 3: Additional backup for stubborn cases
    setTimeout(() => {
      if (barcodeInputRef.current) {
        setBarcodeInput('');
        barcodeInputRef.current.focus();
        barcodeInputRef.current.value = '';
        barcodeInputRef.current.select();
      }
    }, 50);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      const item = await databaseService.getInventoryItemByBarcode(barcodeInput.trim());
      if (item) {
        if (item.stock_quantity > 0) {
          try {
            addToCart(item);
            setBarcodeInput(''); // Clear state
            setSuccess('Item added to cart');
            setTimeout(() => setSuccess(''), 3000);
            // Refocus the barcode input for next scan
            refocusBarcodeInput();
            
            // Instantly clear and refocus for next scan
            if (barcodeInputRef.current) {
              setBarcodeInput(''); // Clear React state
              barcodeInputRef.current.value = '';
              barcodeInputRef.current.focus();
              barcodeInputRef.current.select();
            }
          } catch (cartError) {
            setError(cartError instanceof Error ? cartError.message : 'Error adding item to cart');
            refocusBarcodeInput();
          }
        } else {
          setError('Item out of stock');
          refocusBarcodeInput();
        }
      } else {
        setError('Item not found');
        refocusBarcodeInput();
      }
    } catch (err) {
      setError('Error finding item');
      refocusBarcodeInput();
    } finally {
      setLoading(false);
    }
  };

  const handleManualItemSubmit = async () => {
    if (!manualItemCode.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      const item = await databaseService.getInventoryItemByBarcode(manualItemCode.trim());
      if (item) {
        if (item.stock_quantity > 0) {
          try {
            addToCart(item);
            setManualItemCode('');
            setManualItemDialog(false);
            setSuccess('Item added to cart');
            setTimeout(() => setSuccess(''), 3000);
            refocusBarcodeInput();
            
            // Instantly clear and refocus for next scan
            if (barcodeInputRef.current) {
              setBarcodeInput(''); // Clear React state
              barcodeInputRef.current.value = '';
              barcodeInputRef.current.focus();
              barcodeInputRef.current.select();
            }
          } catch (cartError) {
            setError(cartError instanceof Error ? cartError.message : 'Error adding item to cart');
            refocusBarcodeInput();
          }
        } else {
          setError('Item out of stock');
          refocusBarcodeInput();
        }
      } else {
        setError('Item not found');
        refocusBarcodeInput();
      }
    } catch (err) {
      setError('Error finding item');
      refocusBarcodeInput();
    } finally {
      setLoading(false);
    }
  };

  const handlePriceOverride = (itemId: number) => {
    const cartItem = cartItems.find(item => item.item.id === itemId);
    if (cartItem) {
      setSelectedItemForPriceOverride(itemId);
      setNewPrice(cartItem.unit_price.toString());
      setPriceOverrideDialog(true);
    }
  };

  const handlePriceOverrideConfirm = () => {
    if (selectedItemForPriceOverride && newPrice && !isNaN(parseFloat(newPrice))) {
      updateItemPrice(selectedItemForPriceOverride, parseFloat(newPrice));
      setPriceOverrideDialog(false);
      setSelectedItemForPriceOverride(null);
      setNewPrice('');
      setSuccess('Price updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const generateSaleId = () => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-8);
    return `SALE${timestamp}`;
  };

  const loadCustomerOffers = async (mobile: string) => {
    if (mobile.length === 10 && /^[6-9]\d{9}$/.test(mobile)) {
      try {
        const offers = await databaseService.getCustomerOffers(mobile);
        setCustomerOffers(offers);
      } catch (err) {
        console.error('Error loading customer offers:', err);
        setCustomerOffers([]);
      }
    } else {
      setCustomerOffers([]);
    }
  };

  const handleCreateOffer = async () => {
    if (!customerMobile || customerMobile.length !== 10) {
      setError('Please enter a valid mobile number first');
      return;
    }

    if (!offerFormData.offer_description.trim()) {
      setError('Please enter an offer description');
      return;
    }

    if (offerFormData.discount_percentage <= 0) {
      setError('Please enter a valid discount percentage');
      return;
    }

    try {
      setLoading(true);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      
      await databaseService.createCustomerOffer({
        customer_mobile: customerMobile,
        offer_type: 'discount',
        offer_description: offerFormData.offer_description,
        discount_percentage: offerFormData.discount_percentage,
        discount_amount: 0,
        bundle_eligible: false,
        enabled_by_cashier: false,
        valid_from: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        is_used: false
      });

      await loadCustomerOffers(customerMobile);
      setOfferDialogOpen(false);
      setOfferFormData({
        offer_description: '',
        discount_percentage: 0
      });
      setSuccess('Offer created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create offer';
      setError(errorMessage);
      console.error('Error creating offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty');
      return;
    }

    // Validate customer information
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }

    // Validate mobile number format only if provided (now optional)
    if (customerMobile.trim()) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(customerMobile.trim())) {
        setError('Please enter a valid 10-digit mobile number or leave it empty');
        return;
      }
    }

    // Validate stock levels before checkout
    for (const cartItem of cartItems) {
      if (cartItem.quantity > cartItem.item.stock_quantity) {
        setError(`Insufficient stock for ${cartItem.item.style_name}. Only ${cartItem.item.stock_quantity} units available.`);
        return;
      }
    }

    // Handle different payment methods
    if (paymentMethod === 'cash') {
      setCashPaymentDialog(true);
      return;
    } else if (paymentMethod === 'mixed') {
      setMixedPaymentDialog(true);
      return;
    } else {
      // For online and pending payments, proceed directly
      await processCheckout();
    }
  };

  const processCheckout = async (cashAmount?: number, onlineAmount?: number) => {
    try {
      setLoading(true);
      setError('');
      
      // Use normal cart total calculation
      const finalCartTotal = getCartTotal();
      
      const saleId = generateSaleId();
      const sale = {
        sale_id: saleId,
        customer_name: customerName,
        customer_mobile: customerMobile || undefined,
        customer_dob: customerDOB || undefined,
        total_amount: finalCartTotal.subtotal,
        discount_amount: finalCartTotal.discount,
        tax_amount: finalCartTotal.tax,
        final_amount: finalAmount, // Use rounded amount
        payment_method: paymentMethod,
        cash_amount: cashAmount || (paymentMethod === 'cash' ? finalAmount : 0),
        online_amount: onlineAmount || (paymentMethod === 'online' ? finalAmount : 0),
        cashier_id: user?.id || 1
      };

      // Create sale record
      const createdSaleId = await databaseService.createSale(sale);
      
      // Retrieve the complete sale object with created_at field
      const completeSale = await databaseService.getSaleById(createdSaleId);
      if (!completeSale) {
        throw new Error('Failed to retrieve created sale');
      }
      
      console.log('Billing - Complete sale object:', completeSale);
      console.log('Billing - Complete sale created_at:', completeSale.created_at);
      console.log('Billing - Complete sale created_at type:', typeof completeSale.created_at);
      
      // Test date parsing
      if (completeSale.created_at) {
        const testDate = new Date(completeSale.created_at);
        console.log('Billing - Parsed date:', testDate);
        console.log('Billing - Is valid date:', !isNaN(testDate.getTime()));
      }


      // Create sale items
      for (const cartItem of cartItems) {
        await databaseService.createSaleItem({
          sale_id: saleId,
          item_id: cartItem.item.id,
          quantity: cartItem.quantity,
          unit_price: cartItem.unit_price,
          total_price: cartItem.unit_price * cartItem.quantity,
          manual_override: cartItem.manual_override
        });

        // Update stock quantity
        const newStock = cartItem.item.stock_quantity - cartItem.quantity;
        await databaseService.updateStockQuantity(cartItem.item.id, newStock);
      }


      // Customer offers are reusable until expiry; do not mark as used
      // Bundle toggle only shows message on receipt - no offer creation

      setSuccess('Sale completed successfully!');
      
      // Store the completed sale data for potential printing
      setCompletedSale({
        sale: completeSale,
        cartItems: [...cartItems], // Create a copy of cart items
        finalCartTotal
      });
      
      // Show print confirmation dialog
      setPrintConfirmationDialog(true);
    } catch (err) {
      setError('Error processing sale');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCart = () => {
    clearCart();
    setCustomerName('');
    setCustomerMobile('');
    setCustomerDOB('');
    setPaymentMethod('cash');
    setBarcodeInput('');
    setError('');
    setSuccess('');
    setEnableBundleCarryforward(false);
    setCustomerOffers([]);
    setOneTimeDiscountInput('');
  };

  const handleOneTimeDiscountChange = (value: string) => {
    setOneTimeDiscountInput(value);
    const discountAmount = parseFloat(value) || 0;
    setOneTimeDiscount(discountAmount);
  };

  const handlePrintConfirmation = async (shouldPrint: boolean) => {
    if (shouldPrint && completedSale) {
      try {
        setLoading(true);
        setPrintAttempted(true);
        const settings = await databaseService.getSettings();
        await ReceiptService.printReceipt(
          completedSale.sale, 
          completedSale.cartItems, 
          settings, 
          user?.username, 
          completedSale.sale.customer_name, 
          completedSale.sale.customer_mobile,
          customerOffers,
          enableBundleCarryforward,
          oneTimeDiscount
        );
        setSuccess('Receipt printed successfully!');
        setTimeout(() => setSuccess(''), 3000);
        // Close dialog after successful print
        setTimeout(() => {
          clearCart();
          setBarcodeInput('');
          setCustomerName('');
          setCustomerMobile('');
          setCustomerDOB('');
          setPrintConfirmationDialog(false);
          setCompletedSale(null);
          setSuccess('');
          setError('');
          setPrintAttempted(false);
        }, 2000);
      } catch (err) {
        setError('Error printing receipt. Please try again.');
        console.error('Print error:', err);
        // Don't close dialog if print fails, let user try again
      } finally {
        setLoading(false);
      }
    } else {
      // User chose to continue without printing
      clearCart();
      setBarcodeInput('');
      setCustomerName('');
      setCustomerMobile('');
      setCustomerDOB('');
      setPrintConfirmationDialog(false);
      setCompletedSale(null);
      setSuccess('');
      setError('');
      setPrintAttempted(false);
    }
  };

  const handleMobileNumberChange = async (mobile: string) => {
    setCustomerMobile(mobile);
    
    // Auto-populate customer name and DOB if mobile number is valid and customer exists
    if (mobile.length === 10 && /^[6-9]\d{9}$/.test(mobile)) {
      try {
        const customer = await databaseService.getCustomerByMobile(mobile);
        if (customer) {
          setCustomerName(customer.customer_name);
          if (customer.customer_dob) {
            setCustomerDOB(customer.customer_dob);
          }
          setSuccess(`Welcome back, ${customer.customer_name}!`);
          setTimeout(() => setSuccess(''), 3000);
        }
        
        // Load customer offers
        await loadCustomerOffers(mobile);
      } catch (err) {
        console.error('Error fetching customer:', err);
      }
    } else {
      setCustomerOffers([]);
    }
  };

  const handleCustomerNameChange = (name: string) => {
    setCustomerName(name);
  };

  const handleCustomerDOBChange = (dob: string) => {
    setCustomerDOB(dob);
  };



  const handlePrintReceipt = async () => {
    if (cartItems.length === 0) return;

    try {
      const saleId = generateSaleId();
      const sale = {
        id: 0, // Temporary ID for receipt generation
        sale_id: saleId,
        customer_name: customerName,
        customer_mobile: customerMobile,
        customer_dob: customerDOB,
        total_amount: cartTotal.subtotal,
        discount_amount: cartTotal.discount,
        tax_amount: cartTotal.tax,
        final_amount: cartTotal.total,
        payment_method: paymentMethod,
        cashier_id: user?.id || 1,
        created_at: new Date().toISOString()
      };

      const settings = await databaseService.getSettings();
      console.log('Billing - Printing receipt with customer info:', { customerName, customerMobile, customerDOB });
      console.log('Billing - Customer name type:', typeof customerName, 'value:', customerName);
      console.log('Billing - Customer mobile type:', typeof customerMobile, 'value:', customerMobile);
      console.log('Billing - Sale object:', sale);
      console.log('Billing - Sale customer_name:', sale.customer_name);
      console.log('Billing - Sale customer_mobile:', sale.customer_mobile);
      
      // Use the sale object's customer data instead of form fields
      console.log('Billing - About to call ReceiptService.printReceipt with:', {
        sale_customer_name: sale.customer_name,
        sale_customer_mobile: sale.customer_mobile,
        form_customer_name: customerName,
        form_customer_mobile: customerMobile
      });
      
      
      await ReceiptService.printReceipt(
        sale, 
        cartItems, 
        settings, 
        user?.username, 
        sale.customer_name, 
        sale.customer_mobile,
        customerOffers,
        enableBundleCarryforward,
        oneTimeDiscount
      );
    } catch (err) {
      setError('Error printing receipt');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Billing & Checkout
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
        {/* Left side - Item scanning and cart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scan or Enter Item
              </Typography>
              
              <Box component="form" onSubmit={handleBarcodeSubmit} sx={{ mb: 2 }}>
                <TextField
                  inputRef={barcodeInputRef}
                  fullWidth
                  label="Barcode Scanner"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  tabIndex={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeSubmit(e);
                    } else if (e.key === 'Tab') {
                      // Allow normal tab behavior - don't prevent default
                      // The focus will move to the next element naturally
                    }
                  }}
                  onBlur={(e) => {
                    // Only refocus barcode input if focus is not moving to another input field or button
                    setTimeout(() => {
                      const activeElement = document.activeElement;
                      const isMovingToInput = activeElement?.tagName === 'INPUT' || 
                                            activeElement?.tagName === 'TEXTAREA' ||
                                            activeElement?.closest('[data-customer-input]') ||
                                            activeElement?.closest('.MuiTextField-root');
                      
                      const isMovingToButton = activeElement?.tagName === 'BUTTON' ||
                                            activeElement?.closest('button') ||
                                            activeElement?.closest('.MuiButton-root') ||
                                            activeElement?.closest('.MuiIconButton-root');
                      
                      if (barcodeInputRef.current && !isMovingToInput && !isMovingToButton) {
                        setBarcodeInput('');
                        barcodeInputRef.current.value = '';
                        barcodeInputRef.current.focus();
                        barcodeInputRef.current.select();
                      }
                    }, 150);
                  }}
                  placeholder="Scan barcode or enter item code"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" disabled={loading}>
                          <QrCodeScanner />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  disabled={loading}
                />
              </Box>

              {/* Customer Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                Customer Information
              </Typography>
              

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Customer Name *"
                    value={customerName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    placeholder="Enter customer name"
                    required
                    disabled={loading}
                    autoComplete="off"
                    tabIndex={2}
                    inputProps={{ 
                      autoComplete: "off",
                      spellCheck: false,
                      'data-customer-input': true
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    value={customerMobile}
                    onChange={(e) => handleMobileNumberChange(e.target.value)}
                    placeholder="Enter 10-digit mobile number (optional)"
                    inputProps={{ 
                      maxLength: 10,
                      autoComplete: "off",
                      spellCheck: false,
                      'data-customer-input': true
                    }}
                    disabled={loading}
                    tabIndex={3}
                    helperText="Optional - Enter 10-digit mobile number starting with 6-9"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={customerDOB}
                    onChange={(e) => handleCustomerDOBChange(e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    disabled={loading}
                    tabIndex={4}
                    helperText="Optional - for birthday tracking"
                    inputProps={{ 
                      autoComplete: "off",
                      'data-customer-input': true
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={loading}>
                    <FormLabel component="legend">Payment Method *</FormLabel>
                    <RadioGroup
                      row
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online' | 'mixed' | 'pending')}
                      tabIndex={5}
                    >
                      <FormControlLabel 
                        value="cash" 
                        control={<Radio tabIndex={5} />} 
                        label="Cash" 
                      />
                      <FormControlLabel 
                        value="online" 
                        control={<Radio tabIndex={6} />} 
                        label="Online" 
                      />
                      <FormControlLabel 
                        value="mixed" 
                        control={<Radio tabIndex={7} />} 
                        label="Mixed" 
                      />
                      <FormControlLabel 
                        value="pending" 
                        control={<Radio tabIndex={8} />} 
                        label="Pending" 
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>

            {/* Special Offer Toggle - Show when customer mobile is provided */}
            {customerMobile && customerMobile.trim().length > 0 && (
              <Box sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Bundle Offer Receipt Message
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableBundleCarryforward}
                      onChange={(e) => setEnableBundleCarryforward(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Add Bundle Offer Message to Receipt"
                />
                {enableBundleCarryforward && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>What happens:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body2" color="success.main">
                        • Receipt will show "Bundle pricing offer valid until [date]"
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        • Date will be 7 days from today
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        • Message appears below the bill summary section
                      </Typography>
                      <Typography variant="body2" color="info.main">
                        • This is only a promotional message - no actual offers are created
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      This adds a promotional message to the receipt. No customer offers are created.
                    </Typography>
                  </Box>
                )}
                
              </Box>
            )}

              {/* Customer Offers Section */}
              {customerOffers.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Available Offers
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {customerOffers.map((offer) => (
                      <Chip
                        key={offer.id}
                        label={`${offer.offer_description} (Valid until ${new Date(offer.valid_until).toLocaleDateString()})`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setManualItemDialog(true)}
                >
                  Add Item Manually
                </Button>
                {customerMobile && customerMobile.length === 10 && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setOfferDialogOpen(true)}
                    disabled={loading}
                  >
                    Create Offer
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Cart Items ({cartItems.length})
              </Typography>

              {cartItems.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No items in cart. Scan or add items to get started.
                </Typography>
              ) : (
                <List>
                  {cartItems.map((cartItem) => (
                    <ListItem key={cartItem.item.id} divider>
                      <ListItemText
                        primary={`${cartItem.item.style_name} (${cartItem.item.color_name}, ${cartItem.item.size})`}
                        secondary={`${cartItem.item.category} - ${cartItem.item.item_code} | Barcode: ${cartItem.item.barcode}`}
                        primaryTypographyProps={{
                          fontSize: '0.75rem' // Reduced from 0.875rem to ~12px (another 2 points smaller)
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.625rem' // Reduced from 0.75rem to ~10px (another 2 points smaller)
                        }}
                      />
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => {
                            try {
                              updateQuantity(cartItem.item.id, cartItem.quantity - 1);
                            } catch (error) {
                              setError(error instanceof Error ? error.message : 'Error updating quantity');
                            }
                          }}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center', fontSize: '0.625rem' }}>
                          {cartItem.quantity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem' }}>
                          ({cartItem.item.stock_quantity} available)
                        </Typography>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => {
                            try {
                              updateQuantity(cartItem.item.id, cartItem.quantity + 1);
                            } catch (error) {
                              setError(error instanceof Error ? error.message : 'Error updating quantity');
                            }
                          }}
                        >
                          <Add />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right', fontSize: '0.625rem' }}>
                          ₹{cartItem.unit_price.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right', fontWeight: 'bold', fontSize: '0.625rem' }}>
                          ₹{(cartItem.unit_price * cartItem.quantity).toFixed(2)}
                        </Typography>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => {
                            try {
                              handlePriceOverride(cartItem.item.id);
                            } catch (error) {
                              setError(error instanceof Error ? error.message : 'Error opening price editor');
                            }
                          }}
                          title="Override Price"
                        >
                          <Receipt />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => {
                            try {
                              removeFromCart(cartItem.item.id);
                            } catch (error) {
                              setError(error instanceof Error ? error.message : 'Error removing item');
                            }
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}

              {/* One-time Discount Input - After Cart Items List */}
              {cartItems.length > 0 && (
                <Box sx={{ 
                  mt: 2, 
                  p: 1.5, 
                  border: '1px solid', 
                  borderColor: oneTimeDiscount > 0 ? 'success.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: oneTimeDiscount > 0 ? 'success.50' : 'background.paper',
                  transition: 'all 0.3s ease-in-out',
                  transform: oneTimeDiscount > 0 ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: oneTimeDiscount > 0 ? '0 2px 8px rgba(76, 175, 80, 0.15)' : 'none',
                  '&:hover': {
                    borderColor: oneTimeDiscount > 0 ? 'success.dark' : 'primary.main',
                    boxShadow: oneTimeDiscount > 0 
                      ? '0 4px 12px rgba(76, 175, 80, 0.2)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-1px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {oneTimeDiscount > 0 ? (
                      <CheckCircle sx={{ 
                        fontSize: 16, 
                        color: 'success.main',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                    ) : (
                      <LocalOffer sx={{ 
                        fontSize: 16, 
                        color: 'text.secondary',
                        opacity: 0.7
                      }} />
                    )}
                    <Typography variant="body2" sx={{ 
                      color: oneTimeDiscount > 0 ? 'success.main' : 'text.secondary',
                      fontWeight: oneTimeDiscount > 0 ? 'medium' : 'normal',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      Additional Discount
                    </Typography>
                    {oneTimeDiscount > 0 && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        color: 'success.main',
                        fontSize: '0.75rem',
                        fontWeight: 'medium',
                        animation: 'fadeIn 0.3s ease-in-out',
                        ml: 1
                      }}>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                          -₹{oneTimeDiscount.toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Discount Amount (₹)"
                    type="number"
                    value={oneTimeDiscountInput}
                    onChange={(e) => handleOneTimeDiscountChange(e.target.value)}
                    placeholder="0"
                    inputProps={{ 
                      min: 0, 
                      step: 0.01,
                      max: cartTotal.subtotal,
                      style: { fontSize: '0.875rem' }
                    }}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.875rem',
                        height: '32px',
                        backgroundColor: oneTimeDiscount > 0 ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                        transition: 'background-color 0.2s ease-in-out'
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.75rem',
                        color: oneTimeDiscount > 0 ? 'success.main' : 'text.secondary'
                      }
                    }}
                  />
                  {oneTimeDiscountInput && (
                    <Typography variant="caption" sx={{ 
                      color: 'text.secondary', 
                      fontSize: '0.7rem',
                      mt: 0.5,
                      display: 'block',
                      animation: 'fadeIn 0.3s ease-in-out'
                    }}>
                      Max: ₹{cartTotal.subtotal.toFixed(2)}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right side - Cart summary and checkout */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal:</Typography>
                  <Typography>₹{cartTotal.subtotal.toFixed(2)}</Typography>
                </Box>
                
                {cartTotal.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography color="success.main">Discount:</Typography>
                    <Typography color="success.main">-₹{cartTotal.discount.toFixed(2)}</Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Tax (GST):</Typography>
                  <Typography>₹{cartTotal.tax.toFixed(2)}</Typography>
                </Box>
                
                {Math.abs(roundOffAmount) > 0.01 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography color={roundOffAmount > 0 ? "success.main" : "error.main"}>
                      Round Off:
                    </Typography>
                    <Typography color={roundOffAmount > 0 ? "success.main" : "error.main"}>
                      {roundOffAmount > 0 ? '+' : ''}₹{roundOffAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}
                
                <Divider sx={{ my: 1 }} />
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6">₹{finalAmount.toFixed(2)}</Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Payment Method:</Typography>
                  <Chip 
                    label={
                      paymentMethod === 'cash' ? 'Cash' : 
                      paymentMethod === 'online' ? 'Online' : 
                      paymentMethod === 'mixed' ? 'Mixed' : 'Pending'
                    } 
                    color={
                      paymentMethod === 'cash' ? 'primary' : 
                      paymentMethod === 'online' ? 'secondary' : 
                      paymentMethod === 'mixed' ? 'info' : 'warning'
                    }
                    size="small"
                  />
                </Box>
              </Box>


              {cartTotal.discountBreakdown.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Applied Discounts:
                  </Typography>
                  {cartTotal.discountBreakdown.map((breakdown, index) => (
                    <Chip
                      key={index}
                      label={breakdown.tier}
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}

              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0 || loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Receipt />}
                >
                  {loading ? 'Processing...' : 'Complete Sale'}
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handlePrintReceipt}
                  disabled={cartItems.length === 0}
                  startIcon={<Print />}
                >
                  Print Receipt
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleClearCart}
                  disabled={cartItems.length === 0}
                  startIcon={<Delete />}
                >
                  Clear Cart
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual item dialog */}
      <Dialog open={manualItemDialog} onClose={() => {
        setManualItemDialog(false);
        refocusBarcodeInput();
      }}>
        <DialogTitle>Add Item Manually</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Code or Barcode"
            fullWidth
            variant="outlined"
            value={manualItemCode}
            onChange={(e) => setManualItemCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualItemSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualItemDialog(false)}>Cancel</Button>
          <Button onClick={handleManualItemSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Price Override Dialog */}
      <Dialog open={priceOverrideDialog} onClose={() => setPriceOverrideDialog(false)}>
        <DialogTitle>Override Price</DialogTitle>
        <DialogContent>
          {selectedItemForPriceOverride && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Item: {cartItems.find(item => item.item.id === selectedItemForPriceOverride)?.item.style_name}
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="New Price (₹)"
                type="number"
                fullWidth
                variant="outlined"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePriceOverrideConfirm()}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceOverrideDialog(false)}>Cancel</Button>
          <Button onClick={handlePriceOverrideConfirm} variant="contained" disabled={!newPrice || isNaN(parseFloat(newPrice))}>
            Update Price
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Offer Dialog */}
      <Dialog open={offerDialogOpen} onClose={() => setOfferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Customer Offer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer Mobile"
                value={customerMobile}
                disabled
                helperText="Customer mobile number for this offer"
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
                label="Offer Description"
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
                <strong>How it works:</strong> Customer offers are automatically applied after tier discounts. 
                For example: ₹5000 bill → ₹250 tier discount → 10% customer offer on remaining ₹4750 = ₹475 additional discount.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateOffer} 
            variant="contained" 
            disabled={loading || !offerFormData.offer_description.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Create Offer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sale Completion Success Dialog */}
      <Dialog 
        open={printConfirmationDialog} 
        onClose={() => handlePrintConfirmation(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              bgcolor: 'success.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mr: 2
            }}>
              <Receipt sx={{ fontSize: 30, color: 'white' }} />
            </Box>
            <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
              Sale Completed!
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
          <Card sx={{ 
            mb: 3, 
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Sale Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Sale ID:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {completedSale?.sale?.sale_id}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Customer:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {completedSale?.sale?.customer_name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Items:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  {completedSale?.cartItems?.length || 0}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" color="primary">Total Amount:</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                  ₹{completedSale?.finalCartTotal?.total?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {printAttempted ? (
            <Box sx={{ mb: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
                {success ? 'Receipt printed successfully! Closing in a moment...' : 'Print failed. Would you like to try again?'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ mb: 3, color: 'text.primary' }}>
              What would you like to do next?
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
          {printAttempted ? (
            <>
              <Button 
                onClick={() => handlePrintConfirmation(false)} 
                variant="outlined" 
                color="primary"
                sx={{ minWidth: 120 }}
              >
                Close
              </Button>
              {error && (
                <Button 
                  onClick={() => handlePrintConfirmation(true)} 
                  variant="contained" 
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <Print />}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? 'Printing...' : 'Try Again'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={() => handlePrintConfirmation(false)} 
                variant="outlined" 
                color="primary"
                sx={{ minWidth: 120 }}
              >
                Continue
              </Button>
              <Button 
                onClick={() => handlePrintConfirmation(true)} 
                variant="contained" 
                color="primary"
                startIcon={loading ? <CircularProgress size={20} /> : <Print />}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? 'Printing...' : 'Print Receipt'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Cash Payment Dialog */}
      <Dialog open={cashPaymentDialog} onClose={() => setCashPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cash Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Bill Amount:</Typography>
              <Typography variant="h6">₹{finalAmount.toFixed(2)}</Typography>
            </Box>
            
            <TextField
              autoFocus
              margin="dense"
              label="Cash Tendered (₹)"
              type="number"
              fullWidth
              variant="outlined"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            {cashTendered && parseFloat(cashTendered) > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Cash Tendered:</Typography>
                  <Typography>₹{parseFloat(cashTendered).toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Bill Amount:</Typography>
                  <Typography>₹{finalAmount.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" color={calculateChange() >= 0 ? "success.main" : "error.main"}>
                    Change:
                  </Typography>
                  <Typography variant="h6" color={calculateChange() >= 0 ? "success.main" : "error.main"}>
                    ₹{calculateChange().toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCashPaymentDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setCashPaymentDialog(false);
              processCheckout(finalAmount, 0);
            }}
            variant="contained"
            disabled={!cashTendered || parseFloat(cashTendered) < finalAmount}
          >
            Complete Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mixed Payment Dialog */}
      <Dialog open={mixedPaymentDialog} onClose={() => setMixedPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mixed Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Total Amount:</Typography>
              <Typography variant="h6">₹{finalAmount.toFixed(2)}</Typography>
            </Box>
            
            <TextField
              autoFocus
              margin="dense"
              label="Cash Amount (₹)"
              type="number"
              fullWidth
              variant="outlined"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Online Amount (₹)"
              type="number"
              fullWidth
              variant="outlined"
              value={onlineAmount}
              onChange={(e) => setOnlineAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            {calculateMixedTotals().total > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Cash Amount:</Typography>
                  <Typography>₹{calculateMixedTotals().cash.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Online Amount:</Typography>
                  <Typography>₹{calculateMixedTotals().online.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Total Paid:</Typography>
                  <Typography>₹{calculateMixedTotals().total.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6" color={calculateMixedTotals().remaining <= 0 ? "success.main" : "error.main"}>
                    {calculateMixedTotals().remaining <= 0 ? "Overpaid:" : "Remaining:"}
                  </Typography>
                  <Typography variant="h6" color={calculateMixedTotals().remaining <= 0 ? "success.main" : "error.main"}>
                    ₹{Math.abs(calculateMixedTotals().remaining).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMixedPaymentDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setMixedPaymentDialog(false);
              processCheckout(calculateMixedTotals().cash, calculateMixedTotals().online);
            }}
            variant="contained"
            disabled={calculateMixedTotals().total <= 0}
          >
            Complete Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Billing;
