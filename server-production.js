const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// Database path configuration - Fixed to use data directory
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'pos_database.db');

// Ensure data directory exists and is writable
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory:', dataDir);
  } catch (error) {
    console.error('❌ Error creating data directory:', error);
  }
}

// Production middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true
}));

// Session configuration - Fixed for HTTP deployment
app.use(session({
  secret: process.env.SESSION_SECRET || 'pos-system-secret-key-2024-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for HTTP deployment (was causing issues)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// Database setup with proper error handling
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔧 Initializing database at:', dbPath);
      
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err);
          reject(err);
          return;
        }
        console.log('✅ Database connection established');
      });

      // Add database error handler
      db.on('error', (err) => {
        console.error('❌ Database error:', err);
      });

      db.serialize(() => {
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating users table:', err);
          } else {
            console.log('✅ Users table ready');
          }
        });

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
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating inventory table:', err);
          } else {
            console.log('✅ Inventory table ready');
          }
        });

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
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating sales table:', err);
          } else {
            console.log('✅ Sales table ready');
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
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating sale_items table:', err);
          } else {
            console.log('✅ Sale items table ready');
          }
        });

        // Create settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating settings table:', err);
          } else {
            console.log('✅ Settings table ready');
          }
        });

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
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating customer_offers table:', err);
          } else {
            console.log('✅ Customer offers table ready');
          }
        });

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating stock_adjustments table:', err);
          } else {
            console.log('✅ Stock adjustments table ready');
          }
        });

        // Create audit_sessions table
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating audit_sessions table:', err);
          } else {
            console.log('✅ Audit sessions table ready');
          }
        });

        // Create final_bills table
        db.run(`CREATE TABLE IF NOT EXISTS final_bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id TEXT NOT NULL,
          sale_item_id INTEGER NOT NULL,
          final_bill_number TEXT NOT NULL,
          memo TEXT,
          is_completed BOOLEAN DEFAULT FALSE,
          completed_by INTEGER,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('❌ Error creating final_bills table:', err);
          } else {
            console.log('✅ Final bills table ready');
          }
        });

        // Add cash_amount and online_amount columns if they don't exist (migration)
        db.run(`ALTER TABLE sales ADD COLUMN cash_amount REAL DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Error adding cash_amount column:', err);
          } else {
            console.log('✅ Cash amount column ready');
          }
        });
        
        db.run(`ALTER TABLE sales ADD COLUMN online_amount REAL DEFAULT 0`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('❌ Error adding online_amount column:', err);
          } else {
            console.log('✅ Online amount column ready');
          }
        });

        // Create default admin user
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin')`, (err) => {
          if (err) {
            console.error('❌ Error creating default admin user:', err);
          } else {
            console.log('✅ Default admin user created (username: admin, password: admin123)');
          }
        });

        console.log('🎉 Database initialized successfully');
        resolve();
      });
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      reject(error);
    }
  });
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: dbPath
  });
});

// Debug endpoint to check users (remove in production)
app.get('/api/debug/users', (req, res) => {
  try {
    db.all('SELECT id, username, role, created_at FROM users', (err, users) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('👥 All users in database:', users);
      res.json({ users, count: users.length });
    });
  } catch (error) {
    console.error('❌ Debug users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, password: password ? '***' : 'missing' });
    
    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // First, let's check if the user exists at all
    db.get('SELECT id, username, role, password FROM users WHERE username = ?', 
      [username], (err, user) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('🔍 User lookup result:', user ? { id: user.id, username: user.username, role: user.role, password: user.password ? '***' : 'missing' } : 'No user found');
        
        if (!user) {
          console.log('❌ User not found:', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Now check password
        if (user.password !== password) {
          console.log('❌ Password mismatch for user:', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('✅ Login successful for user:', username);
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        res.json({ 
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destruction error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/status', (req, res) => {
  try {
    if (req.session.userId) {
      res.json({
        authenticated: true,
        user: {
          id: req.session.userId,
          username: req.session.username,
          role: req.session.role
        }
      });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    console.error('❌ Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory endpoints
app.get('/api/inventory', (req, res) => {
  try {
    db.all('SELECT * FROM inventory ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Inventory fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const { sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity } = req.body;
    
    db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Item created successfully' });
      });
  } catch (error) {
    console.error('❌ Inventory creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk insert inventory items for Excel import
app.post('/api/inventory/bulk', (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    db.serialize(() => {
      const stmt = db.prepare(`INSERT INTO inventory (
        sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      let inserted = 0;
      for (const item of items) {
        stmt.run([
          item.sub_section_name || null,
          item.style_name || null,
          item.color_name || null,
          item.size || null,
          item.item_code,
          item.style || null,
          item.category,
          item.design || null,
          item.barcode || null,
          typeof item.stock_quantity === 'number' ? item.stock_quantity : 0,
        ], (err) => {
          if (err) {
            // Skip duplicates but log others
            if (!String(err.message).includes('UNIQUE')) {
              console.error('❌ Inventory bulk insert error:', err);
            }
          } else {
            inserted += 1;
          }
        });
      }

      stmt.finalize((err) => {
        if (err) {
          console.error('❌ Inventory bulk finalize error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ inserted });
      });
    });
  } catch (error) {
    console.error('❌ Inventory bulk insert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales endpoints
app.get('/api/sales', (req, res) => {
  try {
    db.all('SELECT * FROM sales ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Sales fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const { sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id } = req.body;
    
    db.run(`INSERT INTO sales (sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount, online_amount, cashier_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, final_amount, payment_method, cash_amount || 0, online_amount || 0, cashier_id],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Sale created successfully' });
      });
  } catch (error) {
    console.error('❌ Sales creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Additional inventory endpoints
app.get('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json(row);
    });
  } catch (error) {
    console.error('❌ Inventory item fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity } = req.body;
    db.run(
      `UPDATE inventory SET 
         sub_section_name = COALESCE(?, sub_section_name),
         style_name = COALESCE(?, style_name),
         color_name = COALESCE(?, color_name),
         size = COALESCE(?, size),
         item_code = COALESCE(?, item_code),
         style = COALESCE(?, style),
         category = COALESCE(?, category),
         design = COALESCE(?, design),
         barcode = COALESCE(?, barcode),
         stock_quantity = COALESCE(?, stock_quantity),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity, id],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ updated: this.changes > 0 });
      }
    );
  } catch (error) {
    console.error('❌ Inventory update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/inventory/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (typeof quantity !== 'number') {
      return res.status(400).json({ error: 'quantity must be a number' });
    }
    db.run(
      `UPDATE inventory SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [quantity, id],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ updated: this.changes > 0 });
      }
    );
  } catch (error) {
    console.error('❌ Inventory stock update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ deleted: this.changes > 0 });
    });
  } catch (error) {
    console.error('❌ Inventory delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password endpoint
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Verify current password
    db.get('SELECT password FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.password !== currentPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Update password
      db.run('UPDATE users SET password = ? WHERE id = ?', [newPassword, req.session.userId], function(err2) {
        if (err2) {
          console.error('❌ Database error:', err2);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ message: 'Password updated successfully' });
      });
    });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales: sale items endpoints used by client
app.get('/api/sales/:saleId/items', (req, res) => {
  try {
    const { saleId } = req.params;
    db.all('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC', [saleId], (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Sale items fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sales/:saleId/items', (req, res) => {
  try {
    const { saleId } = req.params;
    const { item_id, quantity, unit_price, total_price, manual_override } = req.body;
    db.run(
      `INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price, manual_override)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [saleId, item_id, quantity, unit_price, total_price, !!manual_override],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, message: 'Sale item created successfully' });
      }
    );
  } catch (error) {
    console.error('❌ Sale item creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/sale-items/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, unit_price, total_price } = req.body;
    db.run(
      `UPDATE sale_items SET 
         quantity = COALESCE(?, quantity),
         unit_price = COALESCE(?, unit_price),
         total_price = COALESCE(?, total_price)
       WHERE id = ?`,
      [quantity, unit_price, total_price, itemId],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ updated: this.changes > 0 });
      }
    );
  } catch (error) {
    console.error('❌ Sale item update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/sales/items/:itemId', (req, res) => {
  try {
    const { itemId } = req.params;
    db.run('DELETE FROM sale_items WHERE id = ?', [itemId], function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ deleted: this.changes > 0 });
    });
  } catch (error) {
    console.error('❌ Sale item delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales reports by date range
app.get('/api/sales/date-range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    db.all(
      `SELECT * FROM sales 
       WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
       ORDER BY created_at DESC`,
      [startDate, endDate],
      (err, rows) => {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    console.error('❌ Sales date-range error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  try {
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      res.json(settings);
    });
  } catch (error) {
    console.error('❌ Settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const entries = Object.entries(req.body || {});
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }
    db.serialize(() => {
      const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      for (const [key, value] of entries) {
        stmt.run([String(key), String(value)]);
      }
      stmt.finalize((err) => {
        if (err) {
          console.error('❌ Settings update error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ updated: entries.length });
      });
    });
  } catch (error) {
    console.error('❌ Settings update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users CRUD endpoints
app.get('/api/users', (req, res) => {
  try {
    db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Users fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, role are required' });
    }
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role], function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID });
    });
  } catch (error) {
    console.error('❌ User create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;
    db.run(
      `UPDATE users SET 
         username = COALESCE(?, username),
         password = COALESCE(?, password),
         role = COALESCE(?, role)
       WHERE id = ?`,
      [username, password, role, id],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ updated: this.changes > 0 });
      }
    );
  } catch (error) {
    console.error('❌ User update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ deleted: this.changes > 0 });
    });
  } catch (error) {
    console.error('❌ User delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer offers endpoints
app.get('/api/customer-offers', (req, res) => {
  try {
    db.all('SELECT * FROM customer_offers ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Offers fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/customer-offers/:mobile', (req, res) => {
  try {
    const { mobile } = req.params;
    db.all('SELECT * FROM customer_offers WHERE customer_mobile = ? ORDER BY created_at DESC', [mobile], (err, rows) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('❌ Offers by mobile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/customer-offers', (req, res) => {
  try {
    const { customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, stackable, sale_id, valid_from, valid_until } = req.body;
    db.run(
      `INSERT INTO customer_offers (customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, bundle_eligible, enabled_by_cashier, stackable, sale_id, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_mobile, offer_type, offer_description || null, discount_percentage || 0, discount_amount || 0, !!bundle_eligible, !!enabled_by_cashier, !!stackable, sale_id || null, valid_from || null, valid_until],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID });
      }
    );
  } catch (error) {
    console.error('❌ Offer create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/customer-offers/:id/use', (req, res) => {
  try {
    const { id } = req.params;
    db.run(
      `UPDATE customer_offers SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
      function(err) {
        if (err) {
          console.error('❌ Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ used: this.changes > 0 });
      }
    );
  } catch (error) {
    console.error('❌ Offer use error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/customer-offers/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM customer_offers WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ deleted: this.changes > 0 });
    });
  } catch (error) {
    console.error('❌ Offer delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Secure bootstrap endpoint to (re)create default admin user in cloud deployments
// Protect with ADMIN_SETUP_TOKEN env var; call once, then remove or rotate token
app.post('/api/admin/bootstrap', (req, res) => {
  try {
    const token = req.headers['x-setup-token'] || req.query.token;
    if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
      return res.status(403).json({ error: 'Forbidden: invalid setup token' });
    }

    const username = (req.body && req.body.username) || 'admin';
    const password = (req.body && req.body.password) || 'admin123';
    const role = 'admin';

    // Ensure users table exists then upsert admin user
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('❌ Error ensuring users table:', err);
          return res.status(500).json({ error: 'Failed to ensure users table' });
        }

        db.run(
          `INSERT INTO users (username, password, role)
           VALUES (?, ?, ?)
           ON CONFLICT(username) DO UPDATE SET password = excluded.password, role = excluded.role`,
          [username, password, role],
          function (err2) {
            if (err2) {
              console.error('❌ Error upserting admin user:', err2);
              return res.status(500).json({ error: 'Failed to create/update admin user' });
            }
            console.log(`✅ Admin user ensured (username: ${username})`);
            return res.json({ message: 'Admin user created/updated', username });
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Bootstrap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export/Import endpoints
app.get('/api/export/all', (req, res) => {
  try {
    // Collect all data
    db.serialize(() => {
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          platform: 'server'
        },
        data: {}
      };

      let completed = 0;
      const total = 8;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          res.json(exportData);
        }
      };

      // Get inventory
      db.all('SELECT * FROM inventory', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting inventory:', err);
          exportData.data.inventory = [];
        } else {
          exportData.data.inventory = rows;
        }
        checkComplete();
      });

      // Get sales
      db.all('SELECT * FROM sales', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting sales:', err);
          exportData.data.sales = [];
        } else {
          exportData.data.sales = rows;
        }
        checkComplete();
      });

      // Get users
      db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting users:', err);
          exportData.data.users = [];
        } else {
          exportData.data.users = rows;
        }
        checkComplete();
      });

      // Get settings
      db.all('SELECT * FROM settings', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting settings:', err);
          exportData.data.settings = {};
        } else {
          const settings = {};
          rows.forEach(row => {
            settings[row.key] = row.value;
          });
          exportData.data.settings = settings;
        }
        checkComplete();
      });

      // Get customer offers
      db.all('SELECT * FROM customer_offers', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting offers:', err);
          exportData.data.offers = [];
        } else {
          exportData.data.offers = rows;
        }
        checkComplete();
      });

      // Get stock adjustments
      db.all('SELECT * FROM stock_adjustments', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting stock adjustments:', err);
          exportData.data.stockAdjustments = [];
        } else {
          exportData.data.stockAdjustments = rows;
        }
        checkComplete();
      });

      // Get audit sessions
      db.all('SELECT * FROM audit_sessions', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting audit sessions:', err);
          exportData.data.auditSessions = [];
        } else {
          exportData.data.auditSessions = rows;
        }
        checkComplete();
      });

      // Get final bills
      db.all('SELECT * FROM final_bills', (err, rows) => {
        if (err) {
          console.error('❌ Error exporting final bills:', err);
          exportData.data.finalBills = [];
        } else {
          exportData.data.finalBills = rows;
        }
        checkComplete();
      });
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/import/all', (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'No data provided for import' });
    }

    const results = {
      inventory: 0,
      sales: 0,
      users: 0,
      settings: 0,
      offers: 0,
      stockAdjustments: 0,
      auditSessions: 0,
      finalBills: 0,
      errors: []
    };

    db.serialize(() => {
      let completed = 0;
      const total = 8;

      const checkComplete = () => {
        completed++;
        if (completed === total) {
          res.json({ message: 'Import completed', results });
        }
      };

      // Import inventory
      if (data.inventory && data.inventory.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO inventory 
          (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        data.inventory.forEach(item => {
          stmt.run([
            item.sub_section_name || null,
            item.style_name || null,
            item.color_name || null,
            item.size || null,
            item.item_code,
            item.style || null,
            item.category || null,
            item.design || null,
            item.barcode || null,
            item.stock_quantity || 0
          ], (err) => {
            if (err) {
              results.errors.push(`Inventory: ${err.message}`);
            } else {
              results.inventory++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import users (if not skipped)
      if (!options.skipUsers && data.users && data.users.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO users 
          (username, password, role) VALUES (?, ?, ?)`);
        
        data.users.forEach(user => {
          stmt.run([user.username, user.password, user.role], (err) => {
            if (err) {
              results.errors.push(`User: ${err.message}`);
            } else {
              results.users++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import sales (if not skipped)
      if (!options.skipSales && data.sales && data.sales.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO sales 
          (sale_id, customer_name, customer_mobile, customer_dob, total_amount, discount_amount, tax_amount, 
           final_amount, payment_method, cash_amount, online_amount, cashier_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        data.sales.forEach(sale => {
          stmt.run([
            sale.sale_id,
            sale.customer_name || null,
            sale.customer_mobile || null,
            sale.customer_dob || null,
            sale.total_amount,
            sale.discount_amount || 0,
            sale.tax_amount || 0,
            sale.final_amount,
            sale.payment_method || 'cash',
            sale.cash_amount || 0,
            sale.online_amount || 0,
            sale.cashier_id || null
          ], (err) => {
            if (err) {
              results.errors.push(`Sale: ${err.message}`);
            } else {
              results.sales++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import settings (if not skipped)
      if (!options.skipSettings && data.settings) {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        Object.entries(data.settings).forEach(([key, value]) => {
          stmt.run([key, String(value)], (err) => {
            if (err) {
              results.errors.push(`Setting: ${err.message}`);
            } else {
              results.settings++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import offers
      if (data.offers && data.offers.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO customer_offers 
          (customer_mobile, offer_type, offer_description, discount_percentage, discount_amount, 
           bundle_eligible, enabled_by_cashier, stackable, sale_id, valid_from, valid_until) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        data.offers.forEach(offer => {
          stmt.run([
            offer.customer_mobile,
            offer.offer_type,
            offer.offer_description || null,
            offer.discount_percentage || 0,
            offer.discount_amount || 0,
            offer.bundle_eligible || false,
            offer.enabled_by_cashier || false,
            offer.stackable || false,
            offer.sale_id || null,
            offer.valid_from || null,
            offer.valid_until
          ], (err) => {
            if (err) {
              results.errors.push(`Offer: ${err.message}`);
            } else {
              results.offers++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import stock adjustments
      if (data.stockAdjustments && data.stockAdjustments.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO stock_adjustments 
          (item_id, item_code, style_name, previous_quantity, adjusted_quantity, difference, reason, adjusted_by, adjusted_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        data.stockAdjustments.forEach(adj => {
          stmt.run([
            adj.item_id,
            adj.item_code,
            adj.style_name,
            adj.previous_quantity,
            adj.adjusted_quantity,
            adj.difference,
            adj.reason,
            adj.adjusted_by,
            adj.adjusted_at
          ], (err) => {
            if (err) {
              results.errors.push(`Stock adjustment: ${err.message}`);
            } else {
              results.stockAdjustments++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import audit sessions
      if (data.auditSessions && data.auditSessions.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO audit_sessions 
          (user_id, session_name, audit_mode, start_time, pause_time, total_pause_time, is_paused, scanned_data) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        
        data.auditSessions.forEach(session => {
          stmt.run([
            session.user_id,
            session.session_name,
            session.audit_mode,
            session.start_time,
            session.pause_time || null,
            session.total_pause_time || 0,
            session.is_paused || false,
            JSON.stringify(session.scanned_data)
          ], (err) => {
            if (err) {
              results.errors.push(`Audit session: ${err.message}`);
            } else {
              results.auditSessions++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }

      // Import final bills
      if (data.finalBills && data.finalBills.length > 0) {
        const stmt = db.prepare(`INSERT OR ${options.overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO final_bills 
          (sale_id, sale_item_id, final_bill_number, memo, is_completed, completed_by, completed_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
        data.finalBills.forEach(bill => {
          stmt.run([
            bill.sale_id,
            bill.sale_item_id,
            bill.final_bill_number,
            bill.memo || null,
            bill.is_completed || false,
            bill.completed_by || null,
            bill.completed_at || null
          ], (err) => {
            if (err) {
              results.errors.push(`Final bill: ${err.message}`);
            } else {
              results.finalBills++;
            }
          });
        });
        stmt.finalize(() => checkComplete());
      } else {
        checkComplete();
      }
    });
  } catch (error) {
    console.error('❌ Import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all handler for React routes (using app.use instead of app.get to avoid Express route parsing issues)
app.use((req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } catch (error) {
    console.error('❌ Error serving React app:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with proper logging
async function startServer() {
  try {
    console.log('🚀 Starting POS Server...');
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔌 Port:', PORT);
    console.log('💾 Database path:', dbPath);
    
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 ===========================================');
      console.log(`🚀 POS Server running on port ${PORT}`);
      console.log(`📊 Database path: ${dbPath}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server ready for cloud deployment!`);
      console.log('🎉 ===========================================');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Process error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start the server
startServer();