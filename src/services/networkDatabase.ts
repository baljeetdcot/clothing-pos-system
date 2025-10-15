import { InventoryItem, Sale, SaleItem, User, Settings, CustomerOffer } from '../types';

class NetworkDatabaseService {
  private baseUrl: string;

  constructor() {
    // Prefer explicit env override first
    const envBase = (window as any).REACT_APP_API_BASE_URL || (process as any).env?.REACT_APP_API_BASE_URL;

    if (envBase) {
      this.baseUrl = envBase;
    } else {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const protocol = window.location.protocol; // 'http:' or 'https:'

      // In production (served over HTTPS, e.g., Zeabur), use same-origin to avoid mixed content and CORS issues
      if (!isLocalhost && protocol === 'https:') {
        this.baseUrl = window.location.origin; // e.g. https://clothing-pos.zeabur.app
      } else {
        // Local development: React dev server on 3000, API on 3001
        const host = window.location.hostname;
        this.baseUrl = `http://${host}:3001`;
      }
    }

    console.log('NetworkDatabaseService initialized with baseUrl:', this.baseUrl);
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`;
      console.log('Making API call to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Include cookies for session management
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Failed to connect to API server at ${this.baseUrl}. Please ensure the server is running.`);
      }
      throw error;
    }
  }

  // User operations
  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      const response = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      // Server returns { message: 'Login successful', user: { ... } }
      return response.user || null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiCall('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async checkAuthStatus(): Promise<{ authenticated: boolean; user?: User }> {
    try {
      return await this.apiCall('/auth/status');
    } catch (error) {
      console.error('Auth status check error:', error);
      return { authenticated: false };
    }
  }

  async createUser(username: string, password: string, role: 'admin' | 'cashier'): Promise<number> {
    const result = await this.apiCall('/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
    return result.id;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.apiCall('/users');
  }

  async updateUser(id: number, updates: { username?: string; password?: string; role?: 'admin' | 'cashier' }): Promise<void> {
    await this.apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.apiCall(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await this.apiCall('/inventory');
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | null> {
    return await this.apiCall(`/inventory/${id}`);
  }

  async getInventoryItemByBarcode(barcode: string): Promise<InventoryItem | null> {
    return await this.apiCall(`/inventory/barcode/${barcode}`);
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.apiCall('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return result.id;
  }

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
    await this.apiCall(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateStockQuantity(id: number, quantity: number): Promise<void> {
    await this.apiCall(`/inventory/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await this.apiCall(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings operations
  async getSettings(): Promise<Settings> {
    return await this.apiCall('/settings');
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    await this.apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Bulk operations
  async bulkInsertInventoryItems(items: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    await this.apiCall('/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Final Bill operations
  async createFinalBill(saleId: string, saleItemId: number, finalBillNumber: string, memo: string): Promise<void> {
    await this.apiCall('/final-bills', {
      method: 'POST',
      body: JSON.stringify({ sale_id: saleId, sale_item_id: saleItemId, final_bill_number: finalBillNumber, memo }),
    });
  }

  async getFinalBillStatus(saleId: string): Promise<{ sale_item_id: number; is_completed: boolean; final_bill_number: string; memo: string; completed_by?: number; completed_at?: string }[]> {
    return await this.apiCall(`/final-bills/${saleId}`);
  }

  async getAllFinalBillStatuses(): Promise<{ sale_item_id: number; is_completed: boolean; final_bill_number: string; memo: string; completed_by?: number; completed_at?: string }[]> {
    return await this.apiCall('/final-bills');
  }

  async updateFinalBill(saleId: string, saleItemId: number, finalBillNumber: string, memo: string): Promise<void> {
    await this.apiCall(`/final-bills/${saleId}/${saleItemId}`, {
      method: 'PUT',
      body: JSON.stringify({ final_bill_number: finalBillNumber, memo }),
    });
  }

  async markFinalBillAsPending(saleId: string, saleItemId: number): Promise<void> {
    await this.apiCall(`/final-bills/${saleId}/${saleItemId}/pending`, {
      method: 'PUT',
    });
  }

  // Sales operations
  async createSale(sale: Omit<Sale, 'id' | 'created_at'>): Promise<number> {
    const result = await this.apiCall('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
    return result.id;
  }

  async createSaleItem(saleItem: Omit<SaleItem, 'id' | 'created_at'>): Promise<number> {
    const result = await this.apiCall(`/sales/${saleItem.sale_id}/items`, {
      method: 'POST',
      body: JSON.stringify(saleItem),
    });
    return result.id;
  }

  async updateSaleItem(itemId: number, updateData: { quantity?: number; unit_price?: number; total_price?: number }): Promise<void> {
    await this.apiCall(`/sale-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getAllSales(): Promise<Sale[]> {
    return await this.apiCall('/sales');
  }

  async getSaleById(id: number): Promise<Sale | null> {
    return await this.apiCall(`/sales/${id}`);
  }

  async getSaleBySaleId(saleId: string): Promise<Sale | null> {
    // This would need to be implemented in the server
    throw new Error('Get sale by sale ID not implemented in network version');
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return await this.apiCall(`/sales/${saleId}/items`);
  }

  async deleteSaleItem(itemId: number): Promise<void> {
    await this.apiCall(`/sales/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    return await this.apiCall(`/sales/date-range?startDate=${startDate}&endDate=${endDate}`);
  }


  async updateSale(saleId: number, updateData: { 
    customer_name?: string; 
    customer_mobile?: string; 
    customer_dob?: string; 
    payment_method?: string;
    total_amount?: number;
    discount_amount?: number;
    tax_amount?: number;
    final_amount?: number;
  }): Promise<void> {
    await this.apiCall(`/sales/${saleId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteSale(saleId: number): Promise<void> {
    await this.apiCall(`/sales/${saleId}`, {
      method: 'DELETE',
    });
  }

  // Customer Offers operations
  async createCustomerOffer(offer: Omit<CustomerOffer, 'id' | 'created_at'>): Promise<number> {
    const result = await this.apiCall('/customer-offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
    return result.id;
  }

  async getCustomerOffers(mobile: string): Promise<CustomerOffer[]> {
    return await this.apiCall(`/customer-offers/${mobile}`);
  }

  async getActiveOffers(): Promise<CustomerOffer[]> {
    return await this.apiCall('/customer-offers');
  }

  async useOffer(offerId: number): Promise<void> {
    await this.apiCall(`/customer-offers/${offerId}/use`, {
      method: 'PUT',
    });
  }

  async deleteOffer(offerId: number): Promise<void> {
    await this.apiCall(`/customer-offers/${offerId}`, {
      method: 'DELETE',
    });
  }

  // Stock adjustment operations
  async createStockAdjustment(adjustment: {
    item_id: number;
    item_code: string;
    style_name: string;
    previous_quantity: number;
    adjusted_quantity: number;
    difference: number;
    reason: string;
    adjusted_by: string;
    adjusted_at: string;
  }): Promise<number> {
    const result = await this.apiCall('/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
    return result.id;
  }

  async getStockAdjustments(): Promise<any[]> {
    return await this.apiCall('/stock-adjustments');
  }

  // Audit Session operations
  async createAuditSession(sessionData: {
    sessionName: string;
    auditMode: 'scan' | 'paused' | 'completed';
    startTime: string;
    pauseTime?: string;
    totalPauseTime: number;
    isPaused: boolean;
    scannedData: Record<string, number>;
  }): Promise<number> {
    const result = await this.apiCall('/audit-sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
    return result.id;
  }

  async getAuditSessions(): Promise<any[]> {
    return await this.apiCall('/audit-sessions');
  }

  async getAuditSessionById(id: number): Promise<any | null> {
    return await this.apiCall(`/audit-sessions/${id}`);
  }

  async updateAuditSession(id: number, updateData: {
    auditMode?: 'scan' | 'paused' | 'completed';
    pauseTime?: string;
    totalPauseTime?: number;
    isPaused?: boolean;
    scannedData?: Record<string, number>;
  }): Promise<void> {
    await this.apiCall(`/audit-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteAuditSession(id: number): Promise<void> {
    await this.apiCall(`/audit-sessions/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer Management operations
  async getCustomers(): Promise<any[]> {
    return await this.apiCall('/customers');
  }

  async getCustomerByMobile(mobile: string): Promise<any | null> {
    return await this.apiCall(`/customers/${mobile}`);
  }

  async createOrUpdateCustomer(customer: { customer_name: string; customer_mobile: string; customer_dob?: string }): Promise<any> {
    return await this.apiCall('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(mobile: string, customer: { customer_name: string; customer_dob?: string }): Promise<any> {
    return await this.apiCall(`/customers/${mobile}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(mobile: string): Promise<any> {
    return await this.apiCall(`/customers/${mobile}`, {
      method: 'DELETE',
    });
  }

  // Export/Import operations
  async exportAllData(): Promise<any> {
    return await this.apiCall('/export/all');
  }

  async importAllData(data: any, options: any = {}): Promise<any> {
    return await this.apiCall('/import/all', {
      method: 'POST',
      body: JSON.stringify({ data, options }),
    });
  }
}

export const networkDatabaseService = new NetworkDatabaseService();
