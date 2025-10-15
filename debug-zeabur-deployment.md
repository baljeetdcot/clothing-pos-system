# Debugging Zeabur Deployment - "Error Finding Item" Issue

## Problem Analysis
When deployed to Zeabur, the app shows "Error finding item" when trying to scan barcodes in the billing section. This suggests the network database service is failing to connect to the API or the database.

## Root Causes
1. **Authentication Issues**: User not properly authenticated
2. **Database Connection**: SQLite database not accessible
3. **API Endpoint Issues**: Server not responding correctly
4. **CORS/Session Issues**: Network requests failing

## Debugging Steps

### 1. Check Browser Console
Open browser developer tools (F12) and check the Console tab for errors:

```javascript
// Look for these error messages:
- "NetworkDatabaseService initialized with baseUrl: ..."
- "Making API call to: ..."
- "Authentication error: ..."
- "HTTP 401: Unauthorized"
- "HTTP 500: Internal Server Error"
```

### 2. Check Network Tab
In browser dev tools, go to Network tab and try scanning a barcode:
- Look for failed requests to `/api/inventory/barcode/...`
- Check the response status and error messages
- Verify the request includes proper authentication cookies

### 3. Test API Endpoints Directly
Try accessing these URLs directly in your browser:
- `https://your-app.zeabur.app/api/auth/status` - Check if you're authenticated
- `https://your-app.zeabur.app/api/inventory` - Check if inventory endpoint works
- `https://your-app.zeabur.app/api/inventory/barcode/1234567890` - Test specific barcode lookup

### 4. Check Server Logs
In Zeabur dashboard, check the server logs for:
- Database connection errors
- Authentication failures
- SQLite file access issues

## Common Fixes

### Fix 1: Database Initialization
The SQLite database might not be properly initialized on Zeabur. Add this to your server startup:

```javascript
// In server.js, add after database initialization
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error', details: err.message });
    } else {
      res.json({ 
        status: 'healthy', 
        inventoryCount: row.count,
        databasePath: dbPath 
      });
    }
  });
});
```

### Fix 2: Add Debug Logging
Add more detailed logging to the barcode lookup:

```javascript
// In server.js, modify the barcode endpoint
app.get('/api/inventory/barcode/:barcode', requireAuth, (req, res) => {
  const { barcode } = req.params;
  console.log('Barcode lookup request:', { barcode, user: req.session.user });
  
  db.get('SELECT * FROM inventory WHERE barcode = ?', [barcode], (err, row) => {
    if (err) {
      console.error('Database error in barcode lookup:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log('Barcode lookup result:', { barcode, found: !!row, item: row });
    res.json(row);
  });
});
```

### Fix 3: Check Authentication
Ensure the user is properly authenticated:

```javascript
// Add this endpoint to check auth status
app.get('/api/debug/auth', (req, res) => {
  res.json({
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    user: req.session?.user || null,
    sessionId: req.sessionID
  });
});
```

### Fix 4: Database File Permissions
Ensure the SQLite database file is writable:

```javascript
// Add this check in server.js
const fs = require('fs');
const path = require('path');

// Check database file permissions
try {
  fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  console.log('Database file is accessible:', dbPath);
} catch (err) {
  console.error('Database file access error:', err);
}
```

## Quick Test Commands

### Test 1: Check if server is running
```bash
curl https://your-app.zeabur.app/api/health
```

### Test 2: Check authentication
```bash
curl -c cookies.txt -X POST https://your-app.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Test 3: Test barcode lookup
```bash
curl -b cookies.txt https://your-app.zeabur.app/api/inventory/barcode/1234567890
```

## Environment Variables Check
Ensure these are set in Zeabur:
- `NODE_ENV=production`
- `PORT=3001` (or whatever port Zeabur assigns)
- Any custom database paths if needed

## Database Migration
If the database is empty, you might need to run the initialization:

```javascript
// Add this endpoint to force database initialization
app.post('/api/debug/init-db', (req, res) => {
  initDatabase().then(() => {
    res.json({ message: 'Database initialized successfully' });
  }).catch(err => {
    res.status(500).json({ error: 'Database initialization failed', details: err.message });
  });
});
```

## Most Likely Solution
The issue is probably that:
1. The SQLite database file doesn't exist or isn't accessible on Zeabur
2. The user isn't properly authenticated
3. The database tables aren't initialized

Try accessing `/api/health` first to see if the database is working, then check authentication status.
