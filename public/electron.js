const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

let mainWindow;
let db;

// Initialize SQLite database
function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(app.getPath('userData'), 'pos-database.db');
    db = new sqlite3.Database(dbPath);
    
    // Create tables one by one to ensure they're created properly
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
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
        console.log('Users table created successfully');
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
          console.error('Error creating inventory table:', err);
          reject(err);
          return;
        }
        console.log('Inventory table created successfully');
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
          console.error('Error creating sales table:', err);
          reject(err);
          return;
        }
        console.log('Sales table created successfully');
      });

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
      )`, (err) => {
        if (err) {
          console.error('Error creating sale_items table:', err);
          reject(err);
          return;
        }
        console.log('Sale_items table created successfully');
      });

      // Create settings table
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating settings table:', err);
          reject(err);
          return;
        }
        console.log('Settings table created successfully');
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
        sale_id TEXT,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating customer_offers table:', err);
          reject(err);
          return;
        }
        console.log('Customer_offers table created successfully');
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating stock_adjustments table:', err);
          reject(err);
          return;
        }
        console.log('Stock_adjustments table created successfully');
      });

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
      )`, (err) => {
        if (err) {
          console.error('Error creating final_bills table:', err);
          reject(err);
          return;
        }
        console.log('Final_bills table created successfully');
      });

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
          reject(err);
          return;
        }
        console.log('Audit_sessions table created successfully');
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
          db.run(`DROP TABLE IF EXISTS audit_sessions_old`, (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
              return;
            }
            
            db.run(`ALTER TABLE audit_sessions RENAME TO audit_sessions_old`, (err) => {
              if (err) {
                console.error('Error renaming table:', err);
                return;
              }
              
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
              )`, (err) => {
                if (err) {
                  console.error('Error creating new audit_sessions table:', err);
                  return;
                }
                
                db.run(`INSERT INTO audit_sessions SELECT * FROM audit_sessions_old`, (err) => {
                  if (err) {
                    console.error('Error migrating data:', err);
                    return;
                  }
                  
                  db.run(`DROP TABLE audit_sessions_old`, (err) => {
                    if (err) {
                      console.error('Error dropping old table:', err);
                    } else {
                      console.log('Audit_sessions table migrated successfully');
                    }
                  });
                });
              });
            });
          });
        } else {
          console.log('Audit_sessions table already supports completed mode');
        }
      });


      // Add customer columns to sales table if they don't exist (migration)
      db.run(`ALTER TABLE sales ADD COLUMN customer_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding customer_name column:', err);
        } else {
          console.log('Customer name column added or already exists');
        }
      });

      db.run(`ALTER TABLE sales ADD COLUMN customer_mobile TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding customer_mobile column:', err);
        } else {
          console.log('Customer mobile column added or already exists');
        }
      });


      // Insert default admin user
      db.run(`INSERT OR IGNORE INTO users (username, password, role) 
              VALUES ('admin', 'admin123', 'admin')`, (err) => {
        if (err) {
          console.error('Error inserting admin user:', err);
          reject(err);
          return;
        }
        console.log('Admin user created successfully');
      });

      // Insert default settings
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('store_name', 'Clothing Store POS')`, (err) => {
        if (err) console.error('Error inserting store_name:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('gstin', '')`, (err) => {
        if (err) console.error('Error inserting gstin:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('tax_rate', '5')`, (err) => {
        if (err) console.error('Error inserting tax_rate:', err);
      });
      db.run(`INSERT OR IGNORE INTO settings (key, value) 
              VALUES ('receipt_footer', 'Thank you for your business!')`, (err) => {
        if (err) console.error('Error inserting receipt_footer:', err);
      });

      // Check if inventory table has any data before inserting sample data
      db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
        if (err) {
          console.error('Error checking inventory count:', err);
          reject(err);
          return;
        }
        
        // Only insert sample data if the table is empty
        if (row.count === 0) {
          console.log('Inserting sample inventory data...');
          
          // Insert sample inventory data with proper clothing store structure
          // Item Code = Barcode (10 digits), Sub Section = Type of Dress, Category = Style Classification
          // Pricing based on Sub Section: Denim, T-shirt, Shirt, Trouser (Formal/Casual)
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('T-shirt', 'Basic Tee', 'Red', 'M', '1234567890', 'Casual', 'Casual', 'Plain', '1234567890', 50)`, (err) => {
            if (err) console.error('Error inserting sample inventory 1:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('T-shirt', 'Basic Tee', 'Blue', 'L', '1234567891', 'Casual', 'Casual', 'Plain', '1234567891', 30)`, (err) => {
            if (err) console.error('Error inserting sample inventory 2:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Shirt', 'Formal Shirt', 'White', 'M', '1234567892', 'Formal', 'Formal', 'Button Down', '1234567892', 25)`, (err) => {
            if (err) console.error('Error inserting sample inventory 3:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Denim', 'Classic Jeans', 'Blue', 'L', '1234567893', 'Casual', 'Casual', 'Straight Fit', '1234567893', 40)`, (err) => {
            if (err) console.error('Error inserting sample inventory 4:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Trouser', 'Chino Pants', 'Black', 'M', '1234567894', 'Casual', 'Casual', 'Chino', '1234567894', 35)`, (err) => {
            if (err) console.error('Error inserting sample inventory 5:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Trouser', 'Formal Pants', 'Navy', 'L', '1234567895', 'Formal', 'Formal', 'Suit Pants', '1234567895', 15)`, (err) => {
            if (err) console.error('Error inserting sample inventory 6:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Shirt', 'Casual Shirt', 'Green', 'M', '1234567896', 'Casual', 'Casual', 'Polo', '1234567896', 20)`, (err) => {
            if (err) console.error('Error inserting sample inventory 7:', err);
          });
          db.run(`INSERT INTO inventory (sub_section_name, style_name, color_name, size, item_code, style, category, design, barcode, stock_quantity) 
                  VALUES ('Denim', 'Skinny Jeans', 'Black', 'S', '1234567897', 'Casual', 'Casual', 'Skinny', '1234567897', 25)`, (err) => {
            if (err) {
              console.error('Error inserting sample inventory 8:', err);
              reject(err);
              return;
            }
            console.log('Sample inventory data inserted successfully');
          });
        } else {
          console.log('Inventory table already has data, skipping sample data insertion');
        }
        
        // Add customer DOB column to sales table if it doesn't exist
        db.run(`ALTER TABLE sales ADD COLUMN customer_dob TEXT`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding customer_dob column:', err);
          } else {
            console.log('Customer DOB column added or already exists');
          }
        });
        
        console.log('Database initialization completed');
        resolve();
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    createWindow();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-query', async (event, query, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        db.all(query, params, (err, rows) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      } else {
        db.run(query, params, function(err) {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve({ changes: this.changes, lastInsertRowid: this.lastID });
          }
        });
      }
    } catch (error) {
      console.error('Database error:', error);
      reject(error);
    }
  });
});

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ]
  });
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Clean up database connection on app quit
app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});
