import { InventoryItem, Sale, SaleItem, User, Settings, CustomerOffer } from '../types';

declare global {
  interface Window {
    electronAPI: {
      queryDatabase: (query: string, params?: any[]) => Promise<any>;
      showOpenDialog: () => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
      platform: string;
      isElectron: boolean;
    };
  }
}

class DatabaseService {
  async query(query: string, params: any[] = []): Promise<any> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.queryDatabase(query, params);
  }

  // User operations
  async authenticateUser(username: string, password: string): Promise<User | null> {
    const users = await this.query(
      'SELECT id, username, role, created_at FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    return users.length > 0 ? users[0] : null;
  }

  async createUser(username: string, password: string, role: 'admin' | 'cashier'): Promise<number> {
    const result = await this.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );
    return result.lastInsertRowid;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
  }

  async deleteUser(id: number): Promise<void> {
    await this.query('DELETE FROM users WHERE id = ?', [id]);
  }

  async updateUser(id: number, updates: { username?: string; password?: string; role?: 'admin' | 'cashier' }): Promise<void> {
    const fields = [];
    const values = [];
    
    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    await this.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Inventory operations
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await this.query('SELECT * FROM inventory ORDER BY created_at DESC');
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | null> {
    const items = await this.query('SELECT * FROM inventory WHERE id = ?', [id]);
    return items.length > 0 ? items[0] : null;
  }

  async getInventoryItemByBarcode(barcode: string): Promise<InventoryItem | null> {
    const items = await this.query('SELECT * FROM inventory WHERE barcode = ?', [barcode]);
    return items.length > 0 ? items[0] : null;
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.query(
      `INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.sub_section_name, item.style_name, item.color_name, item.size, item.item_code, 
       item.style, item.category, item.design, item.barcode, item.stock_quantity]
    );
    return result.lastInsertRowid;
  }

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof InventoryItem]);
    
    await this.query(
      `UPDATE inventory SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  async updateStockQuantity(id: number, quantity: number): Promise<void> {
    await this.query(
      'UPDATE inventory SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, id]
    );
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await this.query('DELETE FROM inventory WHERE id = ?', [id]);
  }


  // Settings operations
  async getSettings(): Promise<Settings> {
    const settings = await this.query('SELECT key, value FROM settings');
    const settingsObj: any = {};
    settings.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });
    return {
      store_name: settingsObj.store_name || 'Clothing Store POS',
      store_address: settingsObj.store_address || '',
      contact_number: settingsObj.contact_number || '',
      gstin: settingsObj.gstin || '',
      tax_rate: parseFloat(settingsObj.tax_rate) || 18,
      receipt_footer: settingsObj.receipt_footer || 'Thank you for your business!'
    };
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.query(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, value.toString()]
      );
    }
  }

  // Bulk operations
  async bulkInsertInventoryItems(items: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    const stmt = `INSERT OR REPLACE INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    for (const item of items) {
      await this.query(stmt, [
        item.sub_section_name, item.style_name, item.color_name, item.size,
        item.item_code, item.style, item.category, item.design, item.barcode, item.stock_quantity
      ]);
    }
  }

  // Final Bill operations
  async createFinalBill(saleId: string, saleItemId: number, finalBillNumber: string, memo: string): Promise<void> {
    await this.query(
      'INSERT INTO final_bills (sale_id, sale_item_id, final_bill_number, memo, is_completed, completed_by, completed_at) VALUES (?, ?, ?, ?, 1, ?, datetime("now"))',
      [saleId, saleItemId, finalBillNumber, memo, 1] // Assuming user ID 1 for now
    );
  }

  async getFinalBillStatus(saleId: string): Promise<{ sale_item_id: number; is_completed: boolean; final_bill_number: string; memo: string; completed_by?: number; completed_at?: string }[]> {
    const result = await this.query(
      'SELECT sale_item_id, is_completed, final_bill_number, memo, completed_by, completed_at FROM final_bills WHERE sale_id = ?',
      [saleId]
    );
    return result || [];
  }

  async getAllFinalBillStatuses(): Promise<{ sale_item_id: number; is_completed: boolean; final_bill_number: string; memo: string; completed_by?: number; completed_at?: string }[]> {
    const result = await this.query(
      'SELECT sale_item_id, is_completed, final_bill_number, memo, completed_by, completed_at FROM final_bills'
    );
    return result || [];
  }

  async updateFinalBill(saleId: string, saleItemId: number, finalBillNumber: string, memo: string): Promise<void> {
    await this.query(
      'UPDATE final_bills SET final_bill_number = ?, memo = ?, updated_at = datetime("now") WHERE sale_id = ? AND sale_item_id = ?',
      [finalBillNumber, memo, saleId, saleItemId]
    );
  }

  async markFinalBillAsPending(saleId: string, saleItemId: number): Promise<void> {
    await this.query(
      'UPDATE final_bills SET is_completed = 0, updated_at = datetime("now") WHERE sale_id = ? AND sale_item_id = ?',
      [saleId, saleItemId]
    );
  }

  async checkAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
    // For Electron mode, check localStorage
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        return { authenticated: true, user };
      } catch (error) {
        console.error('Error parsing saved user:', error);
        return { authenticated: false };
      }
    }
    return { authenticated: false };
  }

  // Sales operations
  async createSale(sale: Omit<Sale, 'id' | 'created_at'>): Promise<number> {
    const result = await this.query(
      'INSERT INTO sales (sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sale.sale_id, sale.customer_name || null, sale.customer_mobile || null, sale.customer_dob || null, sale.total_amount, sale.discount_amount, sale.tax_amount, sale.final_amount, sale.payment_method, sale.cash_amount || 0, sale.online_amount || 0, sale.cashier_id]
    );
    return result.lastInsertRowid;
  }

  async createSaleItem(saleItem: Omit<SaleItem, 'id' | 'created_at'>): Promise<number> {
    const result = await this.query(
      'INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price, manual_override) VALUES (?, ?, ?, ?, ?, ?)',
      [saleItem.sale_id, saleItem.item_id, saleItem.quantity, saleItem.unit_price, saleItem.total_price, saleItem.manual_override]
    );
    return result.lastInsertRowid;
  }

  async updateSaleItem(itemId: number, updateData: { quantity?: number; unit_price?: number; total_price?: number }): Promise<void> {
    const fields = [];
    const values = [];

    if (updateData.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updateData.quantity);
    }
    if (updateData.unit_price !== undefined) {
      fields.push('unit_price = ?');
      values.push(updateData.unit_price);
    }
    if (updateData.total_price !== undefined) {
      fields.push('total_price = ?');
      values.push(updateData.total_price);
    }

    if (fields.length === 0) return;

    values.push(itemId);
    await this.query(
      `UPDATE sale_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteSaleItem(itemId: number): Promise<void> {
    await this.query('DELETE FROM sale_items WHERE id = ?', [itemId]);
  }

  async getSaleItemById(itemId: number): Promise<SaleItem | null> {
    const items = await this.query('SELECT * FROM sale_items WHERE id = ?', [itemId]);
    return items.length > 0 ? items[0] : null;
  }

  async getAllSales(): Promise<Sale[]> {
    return await this.query('SELECT * FROM sales ORDER BY created_at DESC');
  }

  async getSaleById(id: number): Promise<Sale | null> {
    const sales = await this.query('SELECT * FROM sales WHERE id = ?', [id]);
    return sales.length > 0 ? sales[0] : null;
  }

  async getSaleBySaleId(saleId: string): Promise<Sale | null> {
    const sales = await this.query('SELECT * FROM sales WHERE sale_id = ?', [saleId]);
    return sales.length > 0 ? sales[0] : null;
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    const items = await this.query(
      `SELECT si.*, i.*, 
       i.id as inventory_id, i.sub_section_name, i.style_name, i.color_name, i.size, 
       i.item_code, i.style, i.category, i.design, i.barcode, i.stock_quantity,
       i.created_at as inventory_created_at, i.updated_at as inventory_updated_at
       FROM sale_items si 
       LEFT JOIN inventory i ON si.item_id = i.id 
       WHERE si.sale_id = ?`,
      [saleId]
    );
    
    return items.map((item: any) => ({
      id: item.id,
      sale_id: item.sale_id,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      manual_override: item.manual_override,
      created_at: item.created_at,
      inventory_item: {
        id: item.inventory_id,
        sub_section_name: item.sub_section_name,
        style_name: item.style_name,
        color_name: item.color_name,
        size: item.size,
        item_code: item.item_code,
        style: item.style,
        category: item.category,
        design: item.design,
        barcode: item.barcode,
        stock_quantity: item.stock_quantity,
        created_at: item.inventory_created_at,
        updated_at: item.inventory_updated_at
      }
    }));
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    return await this.query(
      'SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC',
      [startDate, endDate]
    );
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
    const fields = [];
    const values = [];

    if (updateData.customer_name !== undefined) {
      fields.push('customer_name = ?');
      values.push(updateData.customer_name);
    }
    if (updateData.customer_mobile !== undefined) {
      fields.push('customer_mobile = ?');
      values.push(updateData.customer_mobile);
    }
    if (updateData.customer_dob !== undefined) {
      fields.push('customer_dob = ?');
      values.push(updateData.customer_dob);
    }
    if (updateData.payment_method !== undefined) {
      fields.push('payment_method = ?');
      values.push(updateData.payment_method);
    }
    if (updateData.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(updateData.total_amount);
    }
    if (updateData.discount_amount !== undefined) {
      fields.push('discount_amount = ?');
      values.push(updateData.discount_amount);
    }
    if (updateData.tax_amount !== undefined) {
      fields.push('tax_amount = ?');
      values.push(updateData.tax_amount);
    }
    if (updateData.final_amount !== undefined) {
      fields.push('final_amount = ?');
      values.push(updateData.final_amount);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(saleId);
    await this.query(
      `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteSale(saleId: number): Promise<void> {
    // Get sale details before deletion to update customer stats
    const sale = await this.query('SELECT customer_mobile, final_amount FROM sales WHERE id = ?', [saleId]);
    
    // First delete all sale items
    await this.query('DELETE FROM sale_items WHERE sale_id = (SELECT sale_id FROM sales WHERE id = ?)', [saleId]);
    
    // Then delete the sale
    await this.query('DELETE FROM sales WHERE id = ?', [saleId]);
    
    // Update customer statistics if customer exists
    if (sale && sale.customer_mobile) {
      await this.query('UPDATE customers SET total_purchases = total_purchases - 1, total_amount = total_amount - ?, updated_at = CURRENT_TIMESTAMP WHERE customer_mobile = ?',
        [sale.final_amount, sale.customer_mobile]);
    }
  }

  // Customer Management operations
  async getCustomers(): Promise<any[]> {
    return await this.query('SELECT * FROM customers ORDER BY last_purchase_date DESC');
  }

  async getCustomerByMobile(mobile: string): Promise<any | null> {
    const result = await this.query('SELECT * FROM customers WHERE customer_mobile = ?', [mobile]);
    return result || null;
  }

  async createOrUpdateCustomer(customer: { customer_name: string; customer_mobile: string; customer_dob?: string }): Promise<number> {
    const result = await this.query(
      'INSERT OR REPLACE INTO customers (customer_name, customer_mobile, customer_dob, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [customer.customer_name, customer.customer_mobile, customer.customer_dob]
    );
    return result.lastID;
  }

  async updateCustomer(mobile: string, customer: { customer_name: string; customer_dob?: string }): Promise<void> {
    await this.query(
      'UPDATE customers SET customer_name = ?, customer_dob = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_mobile = ?',
      [customer.customer_name, customer.customer_dob, mobile]
    );
  }

  async deleteCustomer(mobile: string): Promise<void> {
    await this.query('DELETE FROM customers WHERE customer_mobile = ?', [mobile]);
  }

  // Customer Offers operations
  async createCustomerOffer(offer: Omit<CustomerOffer, 'id' | 'created_at'>): Promise<number> {
    const result = await this.query(
      'INSERT INTO customer_offers (customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, sale_id, valid_from, valid_until, is_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [offer.customer_mobile, offer.offer_type, offer.offer_description, offer.discount_percentage, offer.discount_amount, offer.bundle_eligible, offer.enabled_by_cashier, offer.sale_id || null, offer.valid_from, offer.valid_until, offer.is_used]
    );
    return result.lastInsertRowid;
  }

  async getCustomerOffers(mobile: string): Promise<CustomerOffer[]> {
    // All offers are lifetime valid - no expiry filtering
    return await this.query(
      'SELECT * FROM customer_offers WHERE customer_mobile = ? ORDER BY created_at DESC',
      [mobile]
    );
  }

  async getActiveOffers(): Promise<CustomerOffer[]> {
    // All offers are lifetime valid - no expiry filtering
    return await this.query(
      'SELECT * FROM customer_offers ORDER BY created_at DESC'
    );
  }

  async getUsedOffersForSale(mobile: string, saleId: string, createdAt: string): Promise<CustomerOffer[]> {
    // Prefer exact sale_id mapping if present; otherwise, match by mobile and time proximity (±10 minutes)
    return await this.query(
      `SELECT * FROM customer_offers 
       WHERE customer_mobile = ? AND is_used = TRUE 
         AND (
           sale_id = ?
           OR (
             used_at IS NOT NULL AND ABS(strftime('%s', used_at) - strftime('%s', ?)) <= 600
           )
         )
       ORDER BY used_at DESC`,
      [mobile, saleId, createdAt]
    );
  }

  async useOffer(offerId: number): Promise<void> {
    await this.query(
      'UPDATE customer_offers SET is_used = TRUE, used_at = datetime("now") WHERE id = ?',
      [offerId]
    );
  }

  async deleteOffer(offerId: number): Promise<void> {
    await this.query('DELETE FROM customer_offers WHERE id = ?', [offerId]);
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
    const result = await this.query(
      'INSERT INTO stock_adjustments (item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [adjustment.item_id, adjustment.item_code, adjustment.style_name, adjustment.previous_quantity, adjustment.adjusted_quantity, adjustment.difference, adjustment.reason, adjustment.adjusted_by, adjustment.adjusted_at]
    );
    return result.lastInsertRowid;
  }

  async getStockAdjustments(): Promise<any[]> {
    return await this.query('SELECT * FROM stock_adjustments ORDER BY adjusted_at DESC');
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
    const result = await this.query(
      'INSERT INTO audit_sessions (user_id, session_name, audit_mode, start_time, pause_time, total_pause_time, is_paused, scanned_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, sessionData.sessionName, sessionData.auditMode, sessionData.startTime, sessionData.pauseTime || null, sessionData.totalPauseTime, sessionData.isPaused, JSON.stringify(sessionData.scannedData)]
    );
    return result.lastInsertRowid;
  }

  async getAuditSessions(): Promise<any[]> {
    const sessions = await this.query('SELECT * FROM audit_sessions ORDER BY created_at DESC');
    return sessions.map((session: any) => ({
      ...session,
      scannedData: JSON.parse(session.scanned_data)
    }));
  }

  async getAuditSessionById(id: number): Promise<any | null> {
    const sessions = await this.query('SELECT * FROM audit_sessions WHERE id = ?', [id]);
    if (sessions.length === 0) return null;
    
    const session = sessions[0];
    return {
      ...session,
      scannedData: JSON.parse(session.scanned_data)
    };
  }

  async updateAuditSession(id: number, updateData: {
    auditMode?: 'scan' | 'paused' | 'completed';
    pauseTime?: string;
    totalPauseTime?: number;
    isPaused?: boolean;
    scannedData?: Record<string, number>;
  }): Promise<void> {
    const fields = [];
    const values = [];

    if (updateData.auditMode !== undefined) {
      fields.push('audit_mode = ?');
      values.push(updateData.auditMode);
    }
    if (updateData.pauseTime !== undefined) {
      fields.push('pause_time = ?');
      values.push(updateData.pauseTime);
    }
    if (updateData.totalPauseTime !== undefined) {
      fields.push('total_pause_time = ?');
      values.push(updateData.totalPauseTime);
    }
    if (updateData.isPaused !== undefined) {
      fields.push('is_paused = ?');
      values.push(updateData.isPaused);
    }
    if (updateData.scannedData !== undefined) {
      fields.push('scanned_data = ?');
      values.push(JSON.stringify(updateData.scannedData));
    }

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.query(
      `UPDATE audit_sessions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteAuditSession(id: number): Promise<void> {
    await this.query('DELETE FROM audit_sessions WHERE id = ?', [id]);
  }

  // Export/Import operations
  async exportAllData(): Promise<any> {
    try {
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
        this.getInventoryItems(),
        this.getAllSales(),
        this.getAllUsers(),
        this.getSettings(),
        this.getActiveOffers(),
        this.getStockAdjustments(),
        this.getAuditSessions(),
        this.getAllFinalBillStatuses()
      ]);

      return {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          platform: 'local'
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
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  async importAllData(data: any, options: any = {}): Promise<any> {
    const results = {
      inventory: 0,
      sales: 0,
      users: 0,
      settings: 0,
      offers: 0,
      stockAdjustments: 0,
      auditSessions: 0,
      finalBills: 0,
      errors: [] as string[]
    };

    try {
      // Import inventory
      if (data.inventory && data.inventory.length > 0) {
        for (const item of data.inventory) {
          try {
            await this.createInventoryItem(item);
            results.inventory++;
          } catch (error) {
            results.errors.push(`Inventory: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import users (if not skipped)
      if (!options.skipUsers && data.users && data.users.length > 0) {
        for (const user of data.users) {
          try {
            await this.createUser(user.username, user.password, user.role);
            results.users++;
          } catch (error) {
            results.errors.push(`User: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import sales (if not skipped)
      if (!options.skipSales && data.sales && data.sales.length > 0) {
        for (const sale of data.sales) {
          try {
            await this.createSale(sale);
            results.sales++;
          } catch (error) {
            results.errors.push(`Sale: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import settings (if not skipped)
      if (!options.skipSettings && data.settings) {
        try {
          await this.updateSettings(data.settings);
          results.settings = Object.keys(data.settings).length;
        } catch (error) {
          results.errors.push(`Settings: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Import offers
      if (data.offers && data.offers.length > 0) {
        for (const offer of data.offers) {
          try {
            await this.createCustomerOffer(offer);
            results.offers++;
          } catch (error) {
            results.errors.push(`Offer: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import stock adjustments
      if (data.stockAdjustments && data.stockAdjustments.length > 0) {
        for (const adjustment of data.stockAdjustments) {
          try {
            await this.createStockAdjustment(adjustment);
            results.stockAdjustments++;
          } catch (error) {
            results.errors.push(`Stock adjustment: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import audit sessions
      if (data.auditSessions && data.auditSessions.length > 0) {
        for (const session of data.auditSessions) {
          try {
            await this.createAuditSession(session);
            results.auditSessions++;
          } catch (error) {
            results.errors.push(`Audit session: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Import final bills
      if (data.finalBills && data.finalBills.length > 0) {
        for (const bill of data.finalBills) {
          try {
            await this.createFinalBill(bill.sale_id, bill.sale_item_id, bill.final_bill_number, bill.memo);
            results.finalBills++;
          } catch (error) {
            results.errors.push(`Final bill: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return { message: 'Import completed', results };
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();
