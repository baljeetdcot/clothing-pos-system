const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// Linux-compatible database path configuration
const os = require('os');
const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';

let dbPath;

if (isLinux) {
  // Linux: Use data directory in project root
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory:', dataDir);
  }
  dbPath = process.env.DB_PATH || path.join(dataDir, 'pos_database.db');
} else if (isWindows) {
  // Windows: Use AppData path (original logic)
  const electronDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'clothing-pos', 'pos-database.db');
  const fallbackDbPath = path.join(__dirname, 'pos_database.db');
  
  if (fs.existsSync(electronDbPath)) {
    dbPath = electronDbPath;
  } else {
    dbPath = fallbackDbPath;
  }
} else {
  // macOS/Other: Use home directory
  const homeDbPath = path.join(os.homedir(), '.config', 'clothing-pos', 'pos-database.db');
  const homeDir = path.dirname(homeDbPath);
  if (!fs.existsSync(homeDir)) {
    fs.mkdirSync(homeDir, { recursive: true });
  }
  dbPath = process.env.DB_PATH || homeDbPath;
}

console.log('🔧 Database path:', dbPath);
console.log('🖥️ Platform:', process.platform);

// Production middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true
}));

// Session configuration - Linux compatible
app.use(session({
  secret: process.env.SESSION_SECRET || 'pos-system-secret-key-2024-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
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
    platform: process.platform,
    database: dbPath
  });
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

// Catch-all handler for React routes
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
    console.log('🖥️ Platform:', process.platform);
    console.log('💾 Database path:', dbPath);
    
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 ===========================================');
      console.log(`🚀 POS Server running on port ${PORT}`);
      console.log(`📊 Database path: ${dbPath}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🖥️ Platform: ${process.platform}`);
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
