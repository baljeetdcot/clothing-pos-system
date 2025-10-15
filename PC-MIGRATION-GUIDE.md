# POS System - Complete PC Migration Guide

## 📋 Overview

This comprehensive guide covers all methods to move your Clothing Store POS System from one PC to another, including data migration, network setup, and troubleshooting.

## 🎯 Migration Methods

### Method 1: Complete Project Transfer (Recommended)
**Best for:** Moving to a new PC with all data and settings

### Method 2: Data-Only Migration
**Best for:** Fresh installation with existing data

### Method 3: Network Deployment
**Best for:** Multiple PCs accessing the same system

### Method 4: Executable Distribution
**Best for:** End-user deployment without technical setup

---

## 🚀 Method 1: Complete Project Transfer

### Step 1: Prepare Source PC (Current PC)

#### 1.1 Backup Current Data
```bash
# Create backup folder
mkdir C:\POS_Backup

# Copy essential files
copy pos_database.db C:\POS_Backup\
copy package.json C:\POS_Backup\
copy package-lock.json C:\POS_Backup\
```

#### 1.2 Export Settings (Optional)
- Go to Settings in your POS app
- Export any custom configurations
- Note down any custom store settings

#### 1.3 Create Migration Package
```bash
# Create complete project backup
xcopy "D:\posss" "C:\POS_Backup\posss_complete" /E /I /H /Y
```

### Step 2: Transfer to New PC

#### 2.1 Transfer Methods

**Option A: USB Drive**
1. Copy the entire `posss` folder to USB drive
2. Transfer to new PC
3. Place in desired location (e.g., `D:\posss`)

**Option B: Network Transfer**
1. Share the folder on current PC
2. Access from new PC over network
3. Copy the entire folder

**Option C: Cloud Storage**
1. Upload to Google Drive/OneDrive/Dropbox
2. Download on new PC
3. Extract to desired location

#### 2.2 Verify Transfer
- Check that all files are present
- Verify `pos_database.db` exists
- Ensure `package.json` is intact

### Step 3: Setup on New PC

#### 3.1 Install Prerequisites
1. **Download Node.js** from https://nodejs.org/
2. **Choose LTS version** (recommended: 18.x or 20.x)
3. **Install with default settings**
4. **Restart computer** after installation

#### 3.2 Verify Node.js Installation
```cmd
# Open Command Prompt and run:
node --version
npm --version
```

#### 3.3 Quick Setup (Automated)
1. Navigate to the project folder
2. **Double-click `setup-new-pc.bat`**
3. Wait for automatic installation
4. App will start automatically

#### 3.4 Manual Setup (If automated fails)
```cmd
# Navigate to project folder
cd D:\posss

# Install dependencies
npm install

# Start the application
npm run electron-dev
```

### Step 4: Fix Database Location (IMPORTANT!)

**⚠️ CRITICAL ISSUE**: The app looks for the database in a different location than where you copied it!

#### 4.1 Quick Fix (Automated)
1. **Double-click `fix-database-migration.bat`** in the project folder
2. This will automatically copy your database to the correct location
3. The script will show you exactly where the database is placed

#### 4.2 Manual Fix
1. **Find your database file**: `pos_database.db` in the project folder
2. **Create the correct directory**:
   ```cmd
   mkdir "%USERPROFILE%\AppData\Roaming\clothing-pos"
   ```
3. **Copy the database**:
   ```cmd
   copy "pos_database.db" "%USERPROFILE%\AppData\Roaming\clothing-pos\pos-database.db"
   ```

#### 4.3 Verify Database Location
The database should be at:
- **Windows**: `C:\Users\[YourUsername]\AppData\Roaming\clothing-pos\pos-database.db`
- **Check if it exists**: The file should be there with your data

### Step 5: Verify Migration
1. **Check database**: All inventory, customers, and sales should be present
2. **Test functionality**: Try adding items, processing sales
3. **Verify settings**: Store information should be intact
4. **Test printing**: Ensure receipt printing works

---

## 🔄 Method 2: Data-Only Migration

### When to Use This Method
- Fresh installation on new PC
- Only want to transfer data, not code
- Setting up from scratch with existing data

### Step 1: Prepare Data Export

#### 1.1 Export Database
```bash
# On source PC, create database backup
sqlite3 pos_database.db ".backup backup_database.db"
```

#### 1.2 Export Inventory (Excel)
1. Open POS app on source PC
2. Go to Inventory section
3. Export inventory to Excel
4. Save as `inventory_export.xlsx`

#### 1.3 Export Customer Data
1. Go to Customers section
2. Export customer list
3. Save as `customers_export.xlsx`

#### 1.4 Export Sales Data
1. Go to Reports section
2. Export sales history
3. Save as `sales_export.xlsx`

### Step 2: Fresh Installation on New PC

#### 2.1 Download Source Code
```bash
# Clone or download the project
git clone <repository-url>
# OR download ZIP and extract
```

#### 2.2 Install Dependencies
```cmd
cd posss
npm install
```

#### 2.3 Start Application
```cmd
npm run electron-dev
```

### Step 3: Import Data

#### 3.1 Import Database
```bash
# Stop the application first
# Copy the backup database
copy backup_database.db pos_database.db
```

#### 3.2 Import via Excel (If database import fails)
1. Go to Inventory section
2. Use Excel import feature
3. Import `inventory_export.xlsx`
4. Repeat for customers and sales data

---

## 🌐 Method 3: Network Deployment

### When to Use This Method
- Multiple PCs need access
- Centralized data management
- Real-time synchronization needed

### Step 1: Setup Server PC

#### 1.1 Install on Server PC
```cmd
# Follow Method 1 to install on server PC
cd D:\posss
npm install
```

#### 1.2 Configure for Network Access
```cmd
# Build the application
npm run build

# Start network server
npm run server
```

#### 1.3 Find Server IP Address
```cmd
# Find your IP address
ipconfig
# Look for "IPv4 Address" (e.g., 192.168.1.100)
```

### Step 2: Setup Client PCs

#### 2.1 Install on Client PCs
- Follow Method 1 for basic installation
- OR just install a web browser

#### 2.2 Access from Client PCs
1. Open web browser
2. Navigate to: `http://[SERVER_IP]:3001`
3. Example: `http://192.168.1.100:3001`
4. Login with admin credentials

### Step 3: Configure Network

#### 3.1 Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature"
3. Add Node.js to allowed programs
4. Or add port 3001 to inbound rules

#### 3.2 Router Configuration
- No special configuration needed for local network
- Ensure all PCs are on same network

---

## 📦 Method 4: Executable Distribution

### When to Use This Method
- End-user deployment
- No technical knowledge required
- Standalone application

### Step 1: Create Executable

#### 1.1 Build Application
```cmd
# On development PC
cd D:\posss
npm install
npm run build
```

#### 1.2 Create Installer
```cmd
# Create Windows installer
npm run dist
```

#### 1.3 Find Installer
- Look in `dist` folder
- Find `.exe` installer file
- This is your distribution package

### Step 2: Deploy to New PC

#### 2.1 Transfer Installer
- Copy the `.exe` file to new PC
- Run the installer
- Follow installation wizard

#### 2.2 Data Migration (If needed)
- Copy `pos_database.db` to installation directory
- Usually: `C:\Users\[Username]\AppData\Local\clothing-pos\`

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Node.js is not recognized"
**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart computer
3. Verify with `node --version`

#### Issue 2: "npm install fails"
**Solutions:**
```cmd
# Try different approaches
npm install --legacy-peer-deps
npm install --force
npm cache clean --force
npm install
```

#### Issue 3: "Port 3000 already in use"
**Solutions:**
```cmd
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Or change port
set PORT=3001
npm start
```

#### Issue 4: "Database locked"
**Solutions:**
1. Close all instances of the app
2. Check if another process is using the database
3. Restart the application

#### Issue 5: "Cannot access from network"
**Solutions:**
1. Check Windows Firewall settings
2. Verify IP address is correct
3. Ensure both PCs are on same network
4. Try different port

#### Issue 6: "Electron window doesn't open"
**Solutions:**
```cmd
# Start React app first
npm start

# In another terminal, start Electron
npx electron .
```

#### Issue 7: "Data not showing after migration" (MOST COMMON)
**Problem**: Database is in wrong location - app can't find your data
**Solutions:**
1. **Run the fix script**: Double-click `fix-database-migration.bat`
2. **Manual fix**:
   ```cmd
   # Create the correct directory
   mkdir "%USERPROFILE%\AppData\Roaming\clothing-pos"
   
   # Copy database to correct location
   copy "pos_database.db" "%USERPROFILE%\AppData\Roaming\clothing-pos\pos-database.db"
   ```
3. **Verify location**: Check if database exists at:
   `C:\Users\[YourUsername]\AppData\Roaming\clothing-pos\pos-database.db`

### Performance Issues

#### Slow Performance
1. **Close unnecessary applications**
2. **Ensure adequate RAM** (8GB+ recommended)
3. **Use SSD storage** for better performance
4. **Restart application** if it becomes slow

#### Database Issues
1. **Regular cleanup** of old data
2. **Database optimization** (if supported)
3. **Regular backups**

---

## 📊 Data Migration Checklist

### Pre-Migration
- [ ] Backup current database
- [ ] Export important data to Excel
- [ ] Note down custom settings
- [ ] Test current system functionality

### During Migration
- [ ] Transfer all files correctly
- [ ] Install Node.js on new PC
- [ ] Install dependencies successfully
- [ ] Start application without errors

### Post-Migration
- [ ] Verify all data is present
- [ ] Test all major functions
- [ ] Check printing functionality
- [ ] Verify network access (if applicable)
- [ ] Update any hardcoded paths

---

## 🔒 Security Considerations

### Data Protection
- **Database file** contains all sensitive data
- **Regular backups** are essential
- **Access control** for multi-user setups
- **Network security** for network deployments

### Backup Strategy
1. **Daily automated backups** of database
2. **Weekly manual backups** of entire project
3. **Test restore procedures** regularly
4. **Store backups** in multiple locations

---

## 📞 Support and Maintenance

### Getting Help
1. **Check this guide** first
2. **Review error messages** carefully
3. **Check console logs** for detailed errors
4. **Verify all prerequisites** are installed

### Regular Maintenance
1. **Update dependencies** periodically
2. **Clean up old data** regularly
3. **Monitor performance** and optimize
4. **Test backups** regularly

---

## 🎯 Quick Reference

### Essential Commands
```cmd
# Check Node.js
node --version

# Install dependencies
npm install

# Start development
npm run electron-dev

# Build for production
npm run build

# Start server
npm run server

# Create installer
npm run dist
```

### Important Files
- `pos_database.db` - Main database
- `package.json` - Dependencies
- `setup-new-pc.bat` - Quick setup
- `server.js` - Network server

### Default Ports
- React app: 3000
- Network server: 3001
- Electron: Uses React app port

---

## 📋 Migration Summary

| Method | Complexity | Data Transfer | Best For |
|--------|------------|---------------|----------|
| Complete Transfer | Low | Automatic | Most cases |
| Data-Only | Medium | Manual | Fresh install |
| Network | Medium | Automatic | Multi-PC |
| Executable | Low | Manual | End users |

---

**Choose the method that best fits your needs and technical expertise level.**

**For most users, Method 1 (Complete Project Transfer) is recommended as it's the simplest and most reliable approach.**
