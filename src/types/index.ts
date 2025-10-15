export interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  created_at: string;
}

export interface InventoryItem {
  id: number;
  sub_section_name: string;
  style_name: string;
  color_name: string;
  size: string;
  item_code: string;
  style: string;
  category: string;
  design: string;
  barcode: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  sale_id: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_dob?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_method: 'cash' | 'online' | 'mixed' | 'pending';
  cash_amount?: number;
  online_amount?: number;
  cashier_id: number;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: string;
  item_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  manual_override: boolean;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface CartItem {
  item: InventoryItem;
  quantity: number;
  unit_price: number;
  total_price: number;
  manual_override: boolean;
}

export interface PricingRule {
  category: string;
  single_price: number;
  bundle_price: number;
  bundle_quantity: number;
}

export interface DiscountTier {
  min_amount: number;
  discount_amount: number;
}

export interface Settings {
  store_name: string;
  store_address: string;
  contact_number: string;
  gstin: string;
  tax_rate: number;
  receipt_footer: string;
  min_receipt_rows?: number; // Minimum number of rows to show on receipt for uniformity
}

export interface ExcelImportData {
  sub_section_name: string;
  style_name: string;
  color_name: string;
  size: string;
  item_code: string;
  style: string;
  category: string;
  design: string;
  barcode?: string; // Optional barcode - if present, means 1 stock
}

export interface SalesReport {
  period: string;
  total_sales: number;
  total_discounts: number;
  total_tax: number;
  total_transactions: number;
  sales_by_category: Record<string, number>;
  discount_breakdown: Record<string, number>;
}

export interface CustomerOffer {
  id: number;
  customer_mobile: string;
  offer_type: string;
  offer_description: string;
  discount_percentage: number;
  discount_amount: number;
  bundle_eligible: boolean;
  enabled_by_cashier: boolean;
  sale_id?: string;
  valid_from: string;
  valid_until: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}
