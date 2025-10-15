const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true
}));

// Session configuration
app.use(session({
  secret: 'pos-system-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json({ 
  limit: '50mb'
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Error handling middleware for JSON parsing
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON parsing error:', error.message);
    res.status(400).json({ 
      error: 'Invalid JSON format in request body',
      details: error.message 
    });
  } else {
    next(error);
  }
});

// Database setup - use the same path as Electron
const os = require('os');
const electronDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'clothing-pos', 'pos-database.db');
const fallbackDbPath = path.join(__dirname, 'pos_database.db');

// Try to use Electron's database path first, fallback to local
let dbPath;
if (fs.existsSync(electronDbPath)) {
  dbPath = electronDbPath;
  console.log('Using Electron database:', dbPath);
} else {
  dbPath = fallbackDbPath;
  console.log('Using fallback database:', dbPath);
}

console.log('Database path:', dbPath);
console.log('Database exists:', fs.existsSync(dbPath));
console.log('Database writable:', fs.accessSync ? (() => {
  try { fs.accessSync(dbPath, fs.constants.W_OK); return true; } catch { return false; }
})() : 'unknown');

const db = new sqlite3.Database(dbPath);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

// Initialize database tables
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create inventory table
      db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sub_section_name TEXT,
        style_name TEXT,
        color_name TEXT,
        size TEXT,
        item_code TEXT UNIQUE NOT NULL,
        style TEXT,
        category TEXT,
        design TEXT,
        barcode TEXT UNIQUE,
        stock_quantity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create sales table
      db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_mobile TEXT,
        customer_dob TEXT,
        total_amount REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        cash_amount REAL DEFAULT 0,
        online_amount REAL DEFAULT 0,
        cashier_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cashier_id) REFERENCES users (id)
      )`);

      // Add cash_amount and online_amount columns if they don't exist (migration)
      db.run(`ALTER TABLE sales ADD COLUMN cash_amount REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding cash_amount column:', err);
        }
      });
      db.run(`ALTER TABLE sales ADD COLUMN online_amount REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding online_amount column:', err);
        }
      });

      // Create sale_items table
      db.run(`CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        manual_override BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales (sale_id),
        FOREIGN KEY (item_id) REFERENCES inventory (id)
      )`);

      // Create settings table
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create customers table
      db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_mobile TEXT UNIQUE NOT NULL,
        customer_dob TEXT,
        first_purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_purchases INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create customer_offers table
      db.run(`CREATE TABLE IF NOT EXISTS customer_offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_mobile TEXT NOT NULL,
        offer_type TEXT NOT NULL,
        offer_description TEXT,
        discount_percentage REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        bundle_eligible BOOLEAN DEFAULT FALSE,
        enabled_by_cashier BOOLEAN DEFAULT FALSE,
        stackable BOOLEAN DEFAULT FALSE,
        sale_id TEXT,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create stock_adjustments table
      db.run(`CREATE TABLE IF NOT EXISTS stock_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        item_code TEXT NOT NULL,
        style_name TEXT NOT NULL,
        previous_quantity INTEGER NOT NULL,
        adjusted_quantity INTEGER NOT NULL,
        difference INTEGER NOT NULL,
        reason TEXT NOT NULL,
        adjusted_by TEXT NOT NULL,
        adjusted_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory (id)
      )`);

      // Create final_bills table (item-level tracking)
      db.run(`CREATE TABLE IF NOT EXISTS final_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id TEXT NOT NULL,
        sale_item_id INTEGER NOT NULL,
        final_bill_number TEXT NOT NULL,
        memo TEXT,
        is_completed BOOLEAN DEFAULT 0,
        completed_by INTEGER,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales (sale_id),
        FOREIGN KEY (sale_item_id) REFERENCES sale_items (id),
        FOREIGN KEY (completed_by) REFERENCES users (id)
      )`);

      // Create audit_sessions table for persistent audit state
      db.run(`CREATE TABLE IF NOT EXISTS audit_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_name TEXT NOT NULL,
        audit_mode TEXT NOT NULL CHECK(audit_mode IN ('scan', 'paused', 'completed')),
        start_time DATETIME NOT NULL,
        pause_time DATETIME,
        total_pause_time INTEGER DEFAULT 0,
        is_paused BOOLEAN DEFAULT FALSE,
        scanned_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating audit_sessions table:', err);
        } else {
          console.log('Audit_sessions table created successfully');
        }
      });

      // Check if we need to migrate existing audit_sessions table to support 'completed' mode
      db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='audit_sessions'", (err, row) => {
        if (err) {
          console.error('Error checking audit_sessions table schema:', err);
          return;
        }
        
        if (row && row.sql && !row.sql.includes("'completed'")) {
          console.log('Migrating audit_sessions table to support completed mode...');
          // Table exists but doesn't support 'completed' mode, migrate it
          db.run(`DROP TABLE IF EXISTS audit_sessions_old`);
          db.run(`ALTER TABLE audit_sessions RENAME TO audit_sessions_old`);
          db.run(`CREATE TABLE audit_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_name TEXT NOT NULL,
            audit_mode TEXT NOT NULL CHECK(audit_mode IN ('scan', 'paused', 'completed')),
            start_time DATETIME NOT NULL,
            pause_time DATETIME,
            total_pause_time INTEGER DEFAULT 0,
            is_paused BOOLEAN DEFAULT FALSE,
            scanned_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )`);
          db.run(`INSERT INTO audit_sessions SELECT * FROM audit_sessions_old`);
          db.run(`DROP TABLE audit_sessions_old`);
          console.log('Audit_sessions table migrated successfully');
        } else {
          console.log('Audit_sessions table already supports completed mode');
        }
      });

      // Insert default admin user
      db.run(`INSERT OR IGNORE INTO users (username, password, role) 
              VALUES ('admin', 'admin123', 'admin')`);

      // Insert default settings
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('store_name', 'Clothing Store POS')`);
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('store_address', '')`);
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('contact_number', '')`);
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('gstin', '')`);
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('tax_rate', '5')`);
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('receipt_footer', 'Thank you for your business!')`);

      // Check if sample data has already been inserted
      db.get('SELECT value FROM settings WHERE key = ?', ['sample_data_inserted'], (err, row) => {
        if (err) {
          console.error('Error checking sample data status:', err);
          resolve();
          return;
        }
        
        if (row && row.value === 'true') {
          console.log('Sample data already inserted, skipping...');
          resolve();
          return;
        }
        
        // Check if inventory table has any data before inserting sample data
        db.get('SELECT COUNT(*) as count FROM inventory', (err, inventoryRow) => {
          if (err) {
            console.error('Error checking inventory count:', err);
            resolve();
            return;
          }
          
          console.log(`Inventory table has ${inventoryRow.count} items`);
          
          // Only insert sample data if the table is empty AND we haven't inserted sample data before
          if (inventoryRow.count === 0) {
            console.log('Inventory table is empty, inserting sample data...');
          
          // Insert sample inventory data
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('T-shirt', 'Basic Tee', 'Red', 'M', '1234567890', 'Casual', 'Casual', 'Plain', '1234567890', 50)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('T-shirt', 'Basic Tee', 'Blue', 'L', '1234567891', 'Casual', 'Casual', 'Plain', '1234567891', 30)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Shirt', 'Formal Shirt', 'White', 'M', '1234567892', 'Formal', 'Formal', 'Button Down', '1234567892', 25)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Denim', 'Classic Jeans', 'Blue', 'L', '1234567893', 'Casual', 'Casual', 'Straight Fit', '1234567893', 40)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Trouser', 'Chino Pants', 'Black', 'M', '1234567894', 'Casual', 'Casual', 'Chino', '1234567894', 35)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Trouser', 'Formal Pants', 'Navy', 'L', '1234567895', 'Formal', 'Formal', 'Suit Pants', '1234567895', 15)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Shirt', 'Casual Shirt', 'Green', 'M', '1234567896', 'Casual', 'Casual', 'Polo', '1234567896', 20)`);
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Denim', 'Skinny Jeans', 'Black', 'S', '1234567897', 'Casual', 'Casual', 'Skinny', '1234567897', 25)`, (err) => {
            if (err) {
              console.error('Error inserting sample inventory:', err);
              reject(err);
              return;
            }
            
            // Mark that sample data has been inserted
            db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('sample_data_inserted', 'true')`, (err) => {
              if (err) {
                console.error('Error marking sample data as inserted:', err);
              }
              console.log('Sample inventory data inserted successfully');
              resolve();
            });
          });
          } else {
            console.log(`Inventory table already has ${inventoryRow.count} items, skipping sample data insertion`);
            resolve();
          }
        });
      });
    });
  });
}

// API Routes
app.get('/api/inventory', requireAuth, (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/inventory/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

app.get('/api/inventory/barcode/:barcode', requireAuth, (req, res) => {
  const { barcode } = req.params;
  console.log('Barcode lookup request:', { 
    barcode, 
    user: req.session.user?.username,
    timestamp: new Date().toISOString()
  });
  
  db.get('SELECT * FROM inventory WHERE barcode = ?', [barcode], (err, row) => {
    if (err) {
      console.error('Database error in barcode lookup:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log('Barcode lookup result:', { 
      barcode, 
      found: !!row, 
      item: row ? `${row.style_name} - ${row.color_name}` : 'not found'
    });
    res.json(row);
  });
});

app.post('/api/inventory', requireAuth, (req, res) => {
  const { sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity } = req.body;
  
  db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/inventory/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  
  db.run(`UPDATE inventory SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...values, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.put('/api/inventory/:id/stock', requireAuth, (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  db.run('UPDATE inventory SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [quantity, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/inventory/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }
    
    res.json({ message: 'Inventory item deleted successfully' });
  });
});

app.post('/api/inventory/bulk', requireAuth, (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items) {
      res.status(400).json({ error: 'Request body is missing items array' });
      return;
    }
    
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Items must be an array' });
      return;
    }
    
    if (items.length === 0) {
      res.status(400).json({ error: 'Items array cannot be empty' });
      return;
    }
    
    console.log(`Processing bulk insert of ${items.length} items`);
    
    const stmt = `INSERT OR REPLACE INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    let completed = 0;
    let hasError = false;
    const errors = [];
    
    items.forEach((item, index) => {
      // Validate required fields
      if (!item.item_code) {
        errors.push(`Item ${index + 1}: item_code is required`);
        hasError = true;
        completed++;
        return;
      }
      
      db.run(stmt, [
        item.sub_section_name || '', item.style_name || '', item.color_name || '', item.size || '',
        item.item_code, item.style || '', item.category || '', item.design || '', 
        item.barcode || item.item_code, item.stock_quantity || 0
      ], function(err) {
        if (err) {
          console.error(`Error inserting item ${index + 1}:`, err);
          errors.push(`Item ${index + 1} (${item.item_code}): ${err.message}`);
          hasError = true;
        }
        
        completed++;
        
        if (completed === items.length) {
          if (hasError) {
            res.status(500).json({ 
              error: 'Some items could not be inserted', 
              details: errors,
              inserted: completed - errors.length,
              failed: errors.length
            });
          } else {
            res.json({ 
              message: `Successfully inserted ${items.length} items`,
              inserted: items.length
            });
          }
        }
      });
    });
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(500).json({ 
      error: 'Internal server error during bulk insert',
      details: error.message
    });
  }
});

// Sales API
app.get('/api/sales', requireAdmin, (req, res) => {
  db.all('SELECT * FROM sales ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id } = req.body;
  
  // Start a transaction to ensure both operations succeed or fail together
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert the sale
    db.run(`INSERT INTO sales (sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount || 0, online_amount || 0, cashier_id],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        const saleDbId = this.lastID;
        
        // If customer information is provided, save/update customer data
        if (customer_name && customer_mobile) {
          db.run('INSERT OR REPLACE INTO customers (customer_name, customer_mobile, customer_dob, last_purchase_date, total_purchases, total_amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, COALESCE((SELECT total_purchases FROM customers WHERE customer_mobile = ?), 0) + 1, COALESCE((SELECT total_amount FROM customers WHERE customer_mobile = ?), 0) + ?, CURRENT_TIMESTAMP)',
            [customer_name, customer_mobile, customer_dob, customer_mobile, customer_mobile, final_amount],
            function(err) {
              if (err) {
                console.error('Error saving customer data:', err);
                // Don't fail the sale if customer save fails, just log it
              }
              
              db.run('COMMIT');
              res.json({ id: saleDbId });
            }
          );
        } else {
          db.run('COMMIT');
          res.json({ id: saleDbId });
        }
      }
    );
  });
});

// Move this route after the specific routes to avoid conflicts

app.post('/api/sales/:saleId/items', requireAuth, (req, res) => {
  const { saleId } = req.params;
  const { item_id, quantity, unit_price, total_price, manual_override } = req.body;
  
  db.run(`INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price, manual_override) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [saleId, item_id, quantity, unit_price, total_price, manual_override],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/sales/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_mobile, customer_dob, payment_method, total_amount, discount_amount, tax_amount, final_amount } = req.body;
  
  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  
  if (customer_name !== undefined) {
    updates.push('customer_name = ?');
    values.push(customer_name);
  }
  if (customer_mobile !== undefined) {
    updates.push('customer_mobile = ?');
    values.push(customer_mobile);
  }
  if (customer_dob !== undefined) {
    updates.push('customer_dob = ?');
    values.push(customer_dob);
  }
  if (payment_method !== undefined) {
    updates.push('payment_method = ?');
    values.push(payment_method);
  }
  if (total_amount !== undefined) {
    updates.push('total_amount = ?');
    values.push(total_amount);
  }
  if (discount_amount !== undefined) {
    updates.push('discount_amount = ?');
    values.push(discount_amount);
  }
  if (tax_amount !== undefined) {
    updates.push('tax_amount = ?');
    values.push(tax_amount);
  }
  if (final_amount !== undefined) {
    updates.push('final_amount = ?');
    values.push(final_amount);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  values.push(id);
  
  db.run(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      
      res.json({ message: 'Sale updated successfully' });
    }
  );
});

// Test endpoint to check if sale item exists
app.get('/api/sale-items/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  console.log(`GET /api/sale-items/${id} - Checking if item exists`);
  
  db.get('SELECT * FROM sale_items WHERE id = ?', [parseInt(id)], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      console.log(`Sale item ${id} not found`);
      res.status(404).json({ error: 'Sale item not found' });
      return;
    }
    
    console.log(`Sale item ${id} found:`, row);
    res.json(row);
  });
});

app.put('/api/customer-offers/:id/use', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE customer_offers SET is_used = 1, used_at = datetime("now") WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    
    res.json({ message: 'Offer marked as used successfully' });
  });
});

app.put('/api/sale-items/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { quantity, unit_price, total_price } = req.body;
  
  console.log(`PUT /api/sale-items/${id} - Updating with:`, { quantity, unit_price, total_price });
  
  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  
  if (quantity !== undefined) {
    updates.push('quantity = ?');
    values.push(quantity);
  }
  if (unit_price !== undefined) {
    updates.push('unit_price = ?');
    values.push(unit_price);
  }
  if (total_price !== undefined) {
    updates.push('total_price = ?');
    values.push(total_price);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  values.push(parseInt(id)); // Ensure ID is an integer
  
  const query = `UPDATE sale_items SET ${updates.join(', ')} WHERE id = ?`;
  console.log('Executing query:', query, 'with values:', values);
  
  db.run(query, values, function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log(`Query executed. Changes: ${this.changes}`);
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Sale item not found' });
      return;
    }
    
    res.json({ message: 'Sale item updated successfully' });
  });
});

app.delete('/api/sales/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Start a transaction to ensure data consistency
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // First, get the sale details before deletion to update customer stats
    db.get('SELECT customer_mobile, final_amount FROM sales WHERE id = ?', [id], (err, sale) => {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!sale) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      
      // Delete all sale items
      db.run('DELETE FROM sale_items WHERE sale_id = (SELECT sale_id FROM sales WHERE id = ?)', [id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Delete the sale
        db.run('DELETE FROM sales WHERE id = ?', [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Update customer statistics (decrease purchase count and total amount)
          if (sale.customer_mobile) {
            db.run('UPDATE customers SET total_purchases = total_purchases - 1, total_amount = total_amount - ?, updated_at = CURRENT_TIMESTAMP WHERE customer_mobile = ?',
              [sale.final_amount, sale.customer_mobile],
              function(err) {
                if (err) {
                  console.error('Error updating customer stats:', err);
                  // Don't fail the deletion if customer update fails
                }
                
                db.run('COMMIT');
                res.json({ message: 'Sale deleted successfully. Customer data preserved.' });
              }
            );
          } else {
            db.run('COMMIT');
            res.json({ message: 'Sale deleted successfully' });
          }
        });
      });
    });
  });
});

// Settings API
app.get('/api/settings', requireAuth, (req, res) => {
  db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.json({
      store_name: settings.store_name || 'Clothing Store POS',
      store_address: settings.store_address || '',
      contact_number: settings.contact_number || '',
      gstin: settings.gstin || '',
      tax_rate: parseFloat(settings.tax_rate) || 18,
      receipt_footer: settings.receipt_footer || 'Thank you for your business!'
    });
  });
});

app.put('/api/settings', requireAuth, (req, res) => {
  const { store_name, store_address, contact_number, gstin, tax_rate, receipt_footer } = req.body;
  
  const updates = [];
  if (store_name !== undefined) updates.push(['store_name', store_name]);
  if (store_address !== undefined) updates.push(['store_address', store_address]);
  if (contact_number !== undefined) updates.push(['contact_number', contact_number]);
  if (gstin !== undefined) updates.push(['gstin', gstin]);
  if (tax_rate !== undefined) updates.push(['tax_rate', tax_rate.toString()]);
  if (receipt_footer !== undefined) updates.push(['receipt_footer', receipt_footer]);
  
  if (updates.length === 0) {
    res.json({ message: 'No settings to update' });
    return;
  }
  
  let completed = 0;
  let hasError = false;
  
  updates.forEach(([key, value]) => {
    db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, value],
      (err) => {
        if (err) {
          console.error(`Error updating setting ${key}:`, err);
          hasError = true;
        }
        completed++;
        
        if (completed === updates.length) {
          if (hasError) {
            res.status(500).json({ error: 'Some settings could not be updated' });
          } else {
            res.json({ message: 'Settings updated successfully' });
          }
        }
      }
    );
  });
});

// Authentication API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT id, username, role, created_at FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (row) {
        // Store user in session
        req.session.user = row;
        res.json({ user: row });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  );
});

// Logout API
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Could not log out' });
    } else {
      res.json({ message: 'Logged out successfully' });
    }
  });
});

// Change own password (no admin required, must be logged in)
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' });
    }
    
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.user.id;
    const username = req.session.user.username;

    // Verify current password
    db.get('SELECT id FROM users WHERE id = ? AND username = ? AND password = ?',
      [userId, username, currentPassword],
      (err, row) => {
        if (err) {
          console.error('Database error during password verification:', err);
          res.status(500).json({ error: 'Database error during password verification' });
          return;
        }
        if (!row) {
          res.status(400).json({ error: 'Current password incorrect' });
          return;
        }
        // Update password
        db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId], function(updateErr) {
          if (updateErr) {
            console.error('Database error during password update:', updateErr);
            res.status(500).json({ error: 'Database error during password update' });
            return;
          }
          console.log(`Password updated successfully for user ${username} (ID: ${userId})`);
          res.json({ message: 'Password updated successfully' });
        });
      }
    );
  } catch (error) {
    console.error('Error in change-password endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Debug endpoint to check server health and database
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
    if (err) {
      res.status(500).json({ 
        status: 'error', 
        error: 'Database error', 
        details: err.message,
        databasePath: dbPath,
        databaseExists: fs.existsSync(dbPath)
      });
    } else {
      res.json({ 
        status: 'healthy', 
        inventoryCount: row.count,
        databasePath: dbPath,
        databaseExists: fs.existsSync(dbPath),
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Debug endpoint to check authentication details
app.get('/api/debug/auth', (req, res) => {
  res.json({
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    user: req.session?.user || null,
    sessionId: req.sessionID,
    sessionData: req.session || null
  });
});

// Audit Sessions API
app.post('/api/audit-sessions', requireAuth, (req, res) => {
  const { sessionName, auditMode, startTime, pauseTime, totalPauseTime, isPaused, scannedData } = req.body;
  const userId = req.session.user.id;
  
  db.run(`INSERT INTO audit_sessions (user_id, session_name, audit_mode, start_time, pause_time, total_pause_time, is_paused, scanned_data) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, sessionName, auditMode, startTime, pauseTime, totalPauseTime, isPaused, JSON.stringify(scannedData)],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/audit-sessions', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  
  db.all('SELECT * FROM audit_sessions WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse scanned_data JSON for each session
    const sessions = rows.map(row => ({
      ...row,
      scannedData: JSON.parse(row.scanned_data)
    }));
    
    res.json(sessions);
  });
});

app.get('/api/audit-sessions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  db.get('SELECT * FROM audit_sessions WHERE id = ? AND user_id = ?', [id, userId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Audit session not found' });
      return;
    }
    
    // Parse scanned_data JSON
    const session = {
      ...row,
      scannedData: JSON.parse(row.scanned_data)
    };
    
    res.json(session);
  });
});

app.put('/api/audit-sessions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { auditMode, pauseTime, totalPauseTime, isPaused, scannedData } = req.body;
  const userId = req.session.user.id;
  
  db.run(`UPDATE audit_sessions 
          SET audit_mode = ?, pause_time = ?, total_pause_time = ?, is_paused = ?, scanned_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?`,
    [auditMode, pauseTime, totalPauseTime, isPaused, JSON.stringify(scannedData), id, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Audit session not found' });
        return;
      }
      
      res.json({ message: 'Audit session updated successfully' });
    }
  );
});

app.delete('/api/audit-sessions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  db.run('DELETE FROM audit_sessions WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Audit session not found' });
      return;
    }
    
    res.json({ message: 'Audit session deleted successfully' });
  });
});

// Users API
app.get('/api/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, password, role],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  
  db.run('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
    [username, password, role, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// Additional Sales API endpoints
app.get('/api/sales/date-range', requireAdmin, (req, res) => {
  const { startDate, endDate } = req.query;
  
  db.all('SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC',
    [startDate, endDate],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get('/api/sales/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM sales WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    
    res.json(row);
  });
});

app.delete('/api/sales/items/:itemId', requireAdmin, (req, res) => {
  const { itemId } = req.params;
  
  db.run('DELETE FROM sale_items WHERE id = ?', [itemId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Sale item not found' });
      return;
    }
    
    res.json({ message: 'Sale item deleted successfully' });
  });
});

app.get('/api/sales/:saleId/items', requireAdmin, (req, res) => {
  const { saleId } = req.params;
  
  db.all(`SELECT si.id as sale_item_id, si.sale_id, si.item_id, si.quantity, si.unit_price, si.total_price, si.manual_override, si.created_at,
         i.id as inventory_id, i.sub_section_name, i.style_name, i.color_name, i.size, 
         i.item_code, i.style, i.category, i.design, i.barcode, i.stock_quantity,
         i.created_at as inventory_created_at, i.updated_at as inventory_updated_at
         FROM sale_items si 
         LEFT JOIN inventory i ON si.item_id = i.id 
         WHERE si.sale_id = ?`,
    [saleId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const items = rows.map((item) => ({
        id: item.sale_item_id,
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
      
      res.json(items);
    }
  );
});

// Customer Offers API
app.get('/api/customer-offers/:mobile', requireAuth, (req, res) => {
  const { mobile } = req.params;
  
  db.all('SELECT * FROM customer_offers WHERE customer_mobile = ? ORDER BY created_at DESC',
    [mobile],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/customer-offers', requireAuth, (req, res) => {
  const { customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, sale_id, valid_from, valid_until, is_used } = req.body;
  
  // Validate required fields
  if (!customer_mobile || !offer_type || !offer_description) {
    return res.status(400).json({ error: 'Missing required fields: customer_mobile, offer_type, offer_description' });
  }
  
  // Validate mobile number format - allow any non-empty mobile number
  if (!customer_mobile || customer_mobile.trim().length === 0) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  
  // Validate discount values - allow 0 for bundle offers
  if (discount_percentage < 0) {
    return res.status(400).json({ error: 'Invalid discount percentage' });
  }
  
  db.run(`INSERT INTO customer_offers (customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, sale_id, valid_from, valid_until, is_used) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, sale_id, valid_from, valid_until, is_used],
    function(err) {
      if (err) {
        console.error('Database error creating customer offer:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log('Customer offer created successfully with ID:', this.lastID);
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/customer-offers', requireAdmin, (req, res) => {
  db.all('SELECT * FROM customer_offers ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.delete('/api/customer-offers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM customer_offers WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }
    
    res.json({ message: 'Offer deleted successfully' });
  });
});

// Stock Adjustments API
app.get('/api/stock-adjustments', requireAdmin, (req, res) => {
  db.all('SELECT * FROM stock_adjustments ORDER BY adjusted_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/stock-adjustments', requireAdmin, (req, res) => {
  const { item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at } = req.body;
  
  db.run(`INSERT INTO stock_adjustments (item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// Customer Management API
app.get('/api/customers', requireAuth, (req, res) => {
  db.all('SELECT * FROM customers ORDER BY last_purchase_date DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/customers/:mobile', requireAuth, (req, res) => {
  const { mobile } = req.params;
  
  db.get('SELECT * FROM customers WHERE customer_mobile = ?', [mobile], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || null);
  });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const { customer_name, customer_mobile, customer_dob } = req.body;
  
  db.run('INSERT OR REPLACE INTO customers (customer_name, customer_mobile, customer_dob, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [customer_name, customer_mobile, customer_dob],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Customer saved successfully' });
    }
  );
});

app.put('/api/customers/:mobile', requireAuth, (req, res) => {
  const { mobile } = req.params;
  const { customer_name, customer_dob } = req.body;
  
  db.run('UPDATE customers SET customer_name = ?, customer_dob = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_mobile = ?',
    [customer_name, customer_dob, mobile],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Customer updated successfully' });
    }
  );
});

app.delete('/api/customers/:mobile', requireAdmin, (req, res) => {
  const { mobile } = req.params;
  
  db.run('DELETE FROM customers WHERE customer_mobile = ?', [mobile], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Customer deleted successfully' });
  });
});

// Final Bills API
app.post('/api/final-bills', requireAdmin, (req, res) => {
  const { sale_id, sale_item_id, final_bill_number, memo } = req.body;
  
  db.run(`INSERT INTO final_bills (sale_id, sale_item_id, final_bill_number, memo, is_completed, completed_by, completed_at) 
          VALUES (?, ?, ?, ?, 1, ?, datetime("now"))`,
    [sale_id, sale_item_id, final_bill_number, memo, 1], // Assuming user ID 1 for now
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/final-bills/:saleId', requireAdmin, (req, res) => {
  const { saleId } = req.params;
  
  db.all(`SELECT sale_item_id, is_completed, final_bill_number, memo, completed_by, completed_at 
          FROM final_bills WHERE sale_id = ?`,
    [saleId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows || []);
    }
  );
});

app.get('/api/final-bills', requireAdmin, (req, res) => {
  db.all(`SELECT sale_item_id, is_completed, final_bill_number, memo, completed_by, completed_at 
          FROM final_bills`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows || []);
    }
  );
});

app.put('/api/final-bills/:saleId/:saleItemId', requireAdmin, (req, res) => {
  const { saleId, saleItemId } = req.params;
  const { final_bill_number, memo } = req.body;
  
  db.run('UPDATE final_bills SET final_bill_number = ?, memo = ?, updated_at = datetime("now") WHERE sale_id = ? AND sale_item_id = ?',
    [final_bill_number, memo, saleId, saleItemId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Final bill not found' });
        return;
      }
      
      res.json({ message: 'Final bill updated successfully' });
    }
  );
});

app.put('/api/final-bills/:saleId/:saleItemId/pending', requireAdmin, (req, res) => {
  const { saleId, saleItemId } = req.params;
  
  db.run('UPDATE final_bills SET is_completed = 0, updated_at = datetime("now") WHERE sale_id = ? AND sale_item_id = ?',
    [saleId, saleItemId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Final bill not found' });
        return;
      }
      
      res.json({ message: 'Final bill marked as pending successfully' });
    }
  );
});

// Export/Import API
app.get('/api/export/all', requireAdmin, (req, res) => {
  try {
    const exportData = async () => {
      const [
        inventory,
        sales,
        users,
        settings,
        customers,
        offers,
        stockAdjustments,
        auditSessions,
        finalBills
      ] = await Promise.all([
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM inventory ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM sales ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT key, value FROM settings', (err, rows) => {
            if (err) reject(err);
            else {
              const settingsObj = {};
              rows.forEach(row => {
                settingsObj[row.key] = row.value;
              });
              resolve({
                store_name: settingsObj.store_name || 'Clothing Store POS',
                store_address: settingsObj.store_address || '',
                contact_number: settingsObj.contact_number || '',
                gstin: settingsObj.gstin || '',
                tax_rate: parseFloat(settingsObj.tax_rate) || 18,
                receipt_footer: settingsObj.receipt_footer || 'Thank you for your business!'
              });
            }
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM customers ORDER BY last_purchase_date DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM customer_offers ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM stock_adjustments ORDER BY adjusted_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT * FROM audit_sessions ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all('SELECT sale_item_id, is_completed, final_bill_number, memo, completed_by, completed_at FROM final_bills', (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        })
      ]);

      return {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          platform: 'server'
        },
        data: {
          inventory,
          sales,
          users,
          settings,
          customers,
          offers,
          stockAdjustments,
          auditSessions,
          finalBills
        }
      };
    };

    exportData().then(data => {
      res.json(data);
    }).catch(err => {
      console.error('Export error:', err);
      res.status(500).json({ error: 'Failed to export data' });
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.post('/api/import/all', requireAdmin, (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    console.log('Import request received:', {
      hasData: !!data,
      hasDataData: !!(data && data.data),
      dataKeys: data ? Object.keys(data) : [],
      dataDataKeys: data && data.data ? Object.keys(data.data) : [],
      options
    });
    
    if (!data || !data.data) {
      console.error('Invalid import data format:', { data, options });
      return res.status(400).json({ error: 'Invalid import data format' });
    }

    const results = {
      inventory: 0,
      sales: 0,
      users: 0,
      customers: 0,
      settings: 0,
      offers: 0,
      stockAdjustments: 0,
      auditSessions: 0,
      finalBills: 0,
      errors: []
    };

    const importData = async () => {
      console.log('Starting import process...');
      
      // Import inventory
      if (data.data.inventory && data.data.inventory.length > 0) {
        console.log(`Importing ${data.data.inventory.length} inventory items...`);
        for (const item of data.data.inventory) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [item.sub_section_name, item.style_name, item.color_name, item.size, item.item_code, 
                 item.style, item.category, item.design, item.barcode, item.stock_quantity],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.inventory++;
          } catch (error) {
            console.error('Failed to import inventory item:', item.item_code, error);
            results.errors.push(`Inventory: ${error.message}`);
          }
        }
        console.log(`Imported ${results.inventory} inventory items`);
      } else {
        console.log('No inventory items to import');
      }

      // Import users (if not skipped)
      if (!options.skipUsers && data.data.users && data.data.users.length > 0) {
        for (const user of data.data.users) {
          try {
            await new Promise((resolve, reject) => {
              db.run('INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)',
                [user.username, user.password, user.role],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.users++;
          } catch (error) {
            results.errors.push(`User: ${error.message}`);
          }
        }
      }

      // Import customers
      if (data.data.customers && data.data.customers.length > 0) {
        console.log(`Importing ${data.data.customers.length} customers...`);
        for (const customer of data.data.customers) {
          try {
            await new Promise((resolve, reject) => {
              db.run('INSERT OR REPLACE INTO customers (customer_name, customer_mobile, customer_dob, first_purchase_date, last_purchase_date, total_purchases, total_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [customer.customer_name, customer.customer_mobile, customer.customer_dob, customer.first_purchase_date, customer.last_purchase_date, customer.total_purchases, customer.total_amount, customer.created_at, customer.updated_at],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.customers++;
          } catch (error) {
            console.error('Failed to import customer:', customer.customer_mobile, error);
            results.errors.push(`Customer: ${error.message}`);
          }
        }
        console.log(`Imported ${results.customers} customers`);
      } else {
        console.log('No customers to import');
      }

      // Import sales (if not skipped)
      if (!options.skipSales && data.data.sales && data.data.sales.length > 0) {
        for (const sale of data.data.sales) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO sales (sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [sale.sale_id, sale.customer_name, sale.customer_mobile, sale.customer_dob, sale.total_amount, sale.discount_amount, sale.tax_amount, sale.final_amount, sale.payment_method, sale.cash_amount || 0, sale.online_amount || 0, sale.cashier_id],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.sales++;
          } catch (error) {
            results.errors.push(`Sale: ${error.message}`);
          }
        }
      }

      // Import settings (if not skipped)
      if (!options.skipSettings && data.data.settings) {
        try {
          for (const [key, value] of Object.entries(data.data.settings)) {
            await new Promise((resolve, reject) => {
              db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, value.toString()],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
          }
          results.settings = Object.keys(data.data.settings).length;
        } catch (error) {
          results.errors.push(`Settings: ${error.message}`);
        }
      }

      // Import offers
      if (data.data.offers && data.data.offers.length > 0) {
        for (const offer of data.data.offers) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO customer_offers (customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, sale_id, valid_from, valid_until, is_used) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [offer.customer_mobile, offer.offer_type, offer.offer_description, offer.discount_percentage, offer.discount_amount, offer.bundle_eligible, offer.enabled_by_cashier, offer.sale_id || null, offer.valid_from, offer.valid_until, offer.is_used],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.offers++;
          } catch (error) {
            results.errors.push(`Offer: ${error.message}`);
          }
        }
      }

      // Import stock adjustments
      if (data.data.stockAdjustments && data.data.stockAdjustments.length > 0) {
        for (const adjustment of data.data.stockAdjustments) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO stock_adjustments (item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [adjustment.item_id, adjustment.item_code, adjustment.style_name, adjustment.previous_quantity, adjustment.adjusted_quantity, adjustment.difference, adjustment.reason, adjustment.adjusted_by, adjustment.adjusted_at],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.stockAdjustments++;
          } catch (error) {
            results.errors.push(`Stock adjustment: ${error.message}`);
          }
        }
      }

      // Import audit sessions
      if (data.data.auditSessions && data.data.auditSessions.length > 0) {
        for (const session of data.data.auditSessions) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO audit_sessions (user_id, session_name, audit_mode, start_time, pause_time, total_pause_time, is_paused, scanned_data) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [session.user_id, session.session_name, session.audit_mode, session.start_time, session.pause_time, session.total_pause_time, session.is_paused, JSON.stringify(session.scanned_data)],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.auditSessions++;
          } catch (error) {
            results.errors.push(`Audit session: ${error.message}`);
          }
        }
      }

      // Import final bills
      if (data.data.finalBills && data.data.finalBills.length > 0) {
        for (const bill of data.data.finalBills) {
          try {
            await new Promise((resolve, reject) => {
              db.run(`INSERT OR REPLACE INTO final_bills (sale_id, sale_item_id, final_bill_number, memo, is_completed, completed_by, completed_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [bill.sale_id, bill.sale_item_id, bill.final_bill_number, bill.memo, bill.is_completed, bill.completed_by, bill.completed_at],
                function(err) {
                  if (err) reject(err);
                  else resolve(this.lastID);
                }
              );
            });
            results.finalBills++;
          } catch (error) {
            results.errors.push(`Final bill: ${error.message}`);
          }
        }
      }

      return results;
    };

    importData().then(results => {
      console.log('Import completed successfully:', results);
      res.json({ message: 'Import completed', results });
    }).catch(err => {
      console.error('Import error:', err);
      res.status(500).json({ error: 'Failed to import data' });
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// Serve static files from build directory (only if it exists)
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  // Serve React app - catch all handler for client-side routing (only for non-API routes)
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // In development mode, only redirect non-API routes to React dev server
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    res.redirect('http://localhost:3000' + req.path);
  });
}

// Start server
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 POS Server running on http://0.0.0.0:${PORT}`);
    console.log(`📱 Access from other devices: http://[YOUR_IP]:${PORT}`);
    console.log(`💻 Local access: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
