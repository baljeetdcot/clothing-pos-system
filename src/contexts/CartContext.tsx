import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, InventoryItem } from '../types';
import { PricingService } from '../services/pricing';

interface CartContextType {
  cartItems: CartItem[];
  customerOffers: any[];
  oneTimeDiscount: number;
  addToCart: (item: InventoryItem, quantity?: number) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  updateItemPrice: (itemId: number, newPrice: number) => void;
  clearCart: () => void;
  setCustomerOffers: (offers: any[]) => void;
  setOneTimeDiscount: (discount: number) => void;
  getCartTotal: () => {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    discountBreakdown: { tier: string; amount: number }[];
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerOffers, setCustomerOffers] = useState<any[]>([]);
  const [oneTimeDiscount, setOneTimeDiscount] = useState<number>(0);

  // Helper function to recalculate unit prices based on pricing rules
  const recalculateUnitPrices = (items: CartItem[]): CartItem[] => {
    if (items.length === 0) return items;
    
    // First, calculate the original subtotal to determine if tier discount applies
    let originalSubtotal = 0;
    items.forEach(item => {
      originalSubtotal += PricingService.calculateItemPrice(item, items, customerOffers, false, 0, 0);
    });
    
    // Calculate tier discount amount
    const cartTotal = PricingService.calculateCartTotal(items, customerOffers, false);
    const tierDiscountAmount = cartTotal.discount;
    
    // Calculate correct unit prices based on pricing rules and bundle logic
    return items.map(cartItem => {
      if (!cartItem.manual_override) {
        // Calculate the correct price for this item using pricing service
        // Apply tier discount proportionally if it exists
        const totalPrice = PricingService.calculateItemPrice(
          cartItem, 
          items, 
          customerOffers, 
          tierDiscountAmount > 0, 
          tierDiscountAmount, 
          originalSubtotal
        );
        const unitPrice = totalPrice / cartItem.quantity;
        
        return {
          ...cartItem,
          unit_price: unitPrice,
          total_price: totalPrice
        };
      }
      return cartItem;
    });
  };

  const addToCart = (item: InventoryItem, quantity: number = 1) => {
    // Validate stock before updating state
    const existingItem = cartItems.find(cartItem => cartItem.item.id === item.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > item.stock_quantity) {
        throw new Error(`Only ${item.stock_quantity} units available in stock`);
      }
    } else {
      if (quantity > item.stock_quantity) {
        throw new Error(`Only ${item.stock_quantity} units available in stock`);
      }
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => cartItem.item.id === item.id);
      
      let updatedItems: CartItem[];
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        updatedItems = prevItems.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        );
      } else {
        // Create new cart item with initial pricing
        const newCartItem: CartItem = {
          item,
          quantity,
          unit_price: 0, // Will be calculated by recalculateUnitPrices
          total_price: 0, // Will be calculated by recalculateUnitPrices
          manual_override: false
        };
        updatedItems = [...prevItems, newCartItem];
      }
      
      // Recalculate prices for all items based on pricing rules
      return recalculateUnitPrices(updatedItems);
    });
  };

  const removeFromCart = (itemId: number) => {
    console.log('CartContext: removeFromCart called with itemId:', itemId);
    setCartItems(prevItems => {
      const filteredItems = prevItems.filter((cartItem: any) => cartItem.item.id !== itemId);
      console.log('CartContext: Items after removal:', filteredItems.length);
      return filteredItems;
    });
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    console.log('CartContext: updateQuantity called with itemId:', itemId, 'quantity:', quantity);
    if (quantity <= 0) {
      console.log('CartContext: Quantity <= 0, removing item');
      removeFromCart(itemId);
      return;
    }

    // Validate stock before updating state
    const cartItem = cartItems.find(item => item.item.id === itemId);
    if (!cartItem) {
      console.log('CartContext: Cart item not found');
      return;
    }

    if (quantity > cartItem.item.stock_quantity) {
      console.log('CartContext: Quantity exceeds stock');
      throw new Error(`Only ${cartItem.item.stock_quantity} units available in stock`);
    }

    setCartItems(prevItems => {
      const updatedItems = prevItems.map(cartItem =>
        cartItem.item.id === itemId
          ? { ...cartItem, quantity }
          : cartItem
      );
      
      console.log('CartContext: Items after quantity update:', updatedItems.length);
      // Recalculate prices for all items based on pricing rules
      return recalculateUnitPrices(updatedItems);
    });
  };

  const updateItemPrice = (itemId: number, newPrice: number) => {
    console.log('CartContext: updateItemPrice called with itemId:', itemId, 'newPrice:', newPrice);
    setCartItems(prevItems =>
      prevItems.map(cartItem =>
        cartItem.item.id === itemId
          ? { 
              ...cartItem, 
              unit_price: newPrice,
              manual_override: true,
              total_price: newPrice * cartItem.quantity
            }
          : cartItem
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setOneTimeDiscount(0);
  };


  const getCartTotal = () => {
    return PricingService.calculateCartTotal(cartItems, customerOffers, false, oneTimeDiscount);
  };

  const value: CartContextType = {
    cartItems,
    customerOffers,
    oneTimeDiscount,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemPrice,
    clearCart,
    setCustomerOffers,
    setOneTimeDiscount,
    getCartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
