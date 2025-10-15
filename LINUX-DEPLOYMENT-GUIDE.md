# Linux VPS Deployment Guide

## 🔍 **Issues Identified Between Windows & Linux**

### 1. **Database Path Differences**
- **Windows:** `%USERPROFILE%\AppData\Roaming\clothing-pos\pos-database.db`
- **Linux:** `/src/data/pos_database.db` (current) or `/home/user/.config/clothing-pos/pos-database.db`

### 2. **File System Differences**
- **Windows:** Backslashes (`\`), case-insensitive paths
- **Linux:** Forward slashes (`/`), case-sensitive paths

### 3. **Permission Differences**
- **Windows:** User-based permissions
- **Linux:** File ownership and chmod permissions

### 4. **Process Management**
- **Windows:** Task Manager, batch files
- **Linux:** systemd, PM2, process management

## 🛠️ **Required Changes**

### 1. **Replace server-production.js with server-linux.js**
The new `server-linux.js` includes:
- ✅ Platform detection (`process.platform`)
- ✅ Linux-compatible database paths
- ✅ Proper directory creation with permissions
- ✅ Cross-platform compatibility

### 2. **Update Package.json Scripts**
```json
{
  "scripts": {
    "start": "node server-linux.js",
    "server": "node server-linux.js",
    "server-prod": "NODE_ENV=production node server-linux.js"
  }
}
```

### 3. **Environment Variables for Zeabur**
Set these in Zeabur dashboard:
```bash
NODE_ENV=production
PORT=8080
DB_PATH=/src/data/pos_database.db
SESSION_SECRET=your-super-secret-session-key-change-this
```

### 4. **File Permissions (if deploying manually)**
```bash
# Make sure the app can write to data directory
chmod 755 /path/to/your/app/data
chown -R $USER:$USER /path/to/your/app/data
```

## 🚀 **Deployment Steps**

### For Zeabur:
1. **Replace** `server-production.js` with `server-linux.js`
2. **Update** `package.json` start script to use `server-linux.js`
3. **Set** environment variables in Zeabur dashboard
4. **Redeploy** the application

### For Manual Linux VPS:
1. **Upload** `server-linux.js` to your VPS
2. **Install** Node.js 18+ on Ubuntu:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Install** dependencies:
   ```bash
   npm install --production
   ```
4. **Set** environment variables:
   ```bash
   export NODE_ENV=production
   export PORT=3001
   export DB_PATH=/var/www/pos-system/data/pos_database.db
   ```
5. **Start** the server:
   ```bash
   node server-linux.js
   ```

## 🔧 **Troubleshooting**

### Database Issues:
```bash
# Check if database file exists
ls -la /src/data/pos_database.db

# Check permissions
ls -la /src/data/

# Fix permissions if needed
chmod 664 /src/data/pos_database.db
chown $USER:$USER /src/data/pos_database.db
```

### Port Issues:
```bash
# Check if port is in use
netstat -tulpn | grep :8080

# Kill process using port
sudo kill -9 $(lsof -t -i:8080)
```

### File System Issues:
```bash
# Check disk space
df -h

# Check file permissions
ls -la server-linux.js
```

## 📊 **Migration Checklist**

### Pre-Deployment:
- [ ] Backup existing database from Windows
- [ ] Test `server-linux.js` locally
- [ ] Verify all environment variables
- [ ] Check file permissions

### During Deployment:
- [ ] Replace server file
- [ ] Update package.json scripts
- [ ] Set environment variables
- [ ] Test database creation
- [ ] Verify API endpoints

### Post-Deployment:
- [ ] Test login functionality
- [ ] Verify all pages load
- [ ] Test Excel import
- [ ] Check reports generation
- [ ] Verify user management

## 🎯 **Expected Results**

After implementing these changes:
- ✅ Database will be created in correct Linux path
- ✅ File permissions will be handled properly
- ✅ Cross-platform compatibility maintained
- ✅ All features working on Linux VPS
- ✅ No more Windows-specific path errors

## 🔄 **Data Migration**

If you have existing data from Windows:

1. **Export** data from Windows app
2. **Upload** database file to Linux VPS
3. **Place** in correct path: `/src/data/pos_database.db`
4. **Set** proper permissions
5. **Restart** the application

The new `server-linux.js` will automatically detect and use existing database files.
