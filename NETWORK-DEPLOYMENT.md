# POS System - Network Deployment Guide

## 🌐 Running on Local Network

This guide shows you how to run the POS system on multiple computers over your local network with a shared database.

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)
1. **Run `setup-network.bat`** - handles everything automatically
2. **Find your IP address** (run `ipconfig` in Command Prompt)
3. **Access from other PCs** using `http://[YOUR_IP]:3001`

### Option 2: Manual Setup
1. **Install dependencies:**
   ```bash
   npm install express sqlite3 cors concurrently
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm run server
   ```

## 📱 Accessing from Other Computers

### Step 1: Find Your Server IP Address
- **Windows:** Open Command Prompt, run `ipconfig`
- **Look for:** "IPv4 Address" under your network adapter
- **Example:** `192.168.1.100`

### Step 2: Access from Other PCs
- **Open web browser** on any computer on the same network
- **Navigate to:** `http://[YOUR_IP]:3001`
- **Example:** `http://192.168.1.100:3001`

## 🔧 Network Configuration

### Port Configuration
- **Default Port:** 3001
- **Change Port:** Set `PORT=3002` environment variable
- **Firewall:** Ensure port 3001 is open

### Database Location
- **Database File:** `pos_database.db` (in project root)
- **Shared Access:** All computers use the same database
- **Backup:** Copy this file to backup your data

## 👥 Multi-User Access

### User Management
- **Default Admin:** username: `admin`, password: `admin123`
- **Create Users:** Use the admin panel
- **Role-Based Access:** Admin vs Cashier permissions

### Concurrent Users
- **Multiple users** can access simultaneously
- **Real-time updates** across all connected devices
- **Shared inventory** and sales data

## 🛠️ Troubleshooting

### Common Issues

1. **"Cannot access from other PC"**
   - Check Windows Firewall settings
   - Ensure both PCs are on same network
   - Verify IP address is correct

2. **"Port 3001 already in use"**
   - Change port: `set PORT=3002 && npm run server`
   - Or kill process using port 3001

3. **"Database locked"**
   - Only one server instance should run
   - Check if another instance is running

4. **"Connection refused"**
   - Verify server is running
   - Check IP address and port
   - Ensure network connectivity

### Firewall Configuration

#### Windows Firewall:
1. **Open Windows Defender Firewall**
2. **Click "Allow an app or feature"**
3. **Add Node.js** to allowed programs
4. **Or add port 3001** to inbound rules

#### Router Configuration:
- **No special configuration** needed for local network
- **Port forwarding** not required for local access

## 📊 Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PC 1          │    │   PC 2          │    │   PC 3          │
│   (Server)      │    │   (Client)      │    │   (Client)      │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Web Server│  │◄───┤  │ Web Browser│  │    │  │ Web Browser│  │
│  │ Port 3001 │  │    │  │           │  │    │  │           │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│        │        │    │        │        │    │        │        │
│  ┌───────────┐  │    │        │        │    │        │        │
│  │ SQLite DB │  │    │        │        │    │        │        │
│  │ (Shared)  │  │    │        │        │    │        │        │
│  └───────────┘  │    │        │        │    │        │        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Considerations

### Local Network Security
- **Only accessible** from local network
- **No internet exposure** by default
- **Shared database** - all users see same data

### User Authentication
- **Basic authentication** implemented
- **Role-based access** (Admin/Cashier)
- **Session management** per browser

### Data Protection
- **Regular backups** recommended
- **Database file** contains all data
- **No encryption** by default

## 📈 Performance

### Recommended Setup
- **Server PC:** 8GB RAM, SSD storage
- **Client PCs:** 4GB RAM minimum
- **Network:** Gigabit Ethernet or WiFi 5/6

### Scaling
- **Up to 10 concurrent users** (recommended)
- **Database performance** may degrade with more users
- **Consider PostgreSQL** for larger deployments

## 🔄 Data Synchronization

### Real-time Updates
- **Inventory changes** appear immediately
- **Sales transactions** sync instantly
- **Stock adjustments** update across all clients

### Backup Strategy
1. **Daily backups** of `pos_database.db`
2. **Export sales data** regularly
3. **Test restore** procedures

## 🚀 Advanced Configuration

### Custom Port
```bash
set PORT=8080
npm run server
```

### HTTPS (Optional)
```bash
# Install SSL certificate
# Modify server.js to use HTTPS
```

### Load Balancing (Multiple Servers)
- **Not recommended** with SQLite
- **Use PostgreSQL** for multiple servers
- **Implement database replication**

## 📞 Support

### Getting Help
1. **Check this guide** first
2. **Verify network connectivity**
3. **Check server logs** for errors
4. **Ensure all dependencies** are installed

### Logs Location
- **Server logs:** Console output
- **Error logs:** Check terminal/command prompt
- **Database logs:** SQLite doesn't log by default

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js on server PC
- [ ] Run `setup-network.bat`
- [ ] Note the server IP address
- [ ] Test access from server PC: `http://localhost:3001`
- [ ] Test access from other PC: `http://[IP]:3001`
- [ ] Login with admin/admin123
- [ ] Configure firewall if needed
- [ ] Start using the system!

**Enjoy your networked POS system! 🎉**
