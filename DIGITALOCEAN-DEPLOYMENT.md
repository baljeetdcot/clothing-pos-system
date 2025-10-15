# POS System - DigitalOcean Deployment Guide (Updated 2024)

## 🌐 Complete Cloud Deployment for Clothing POS System

This comprehensive guide will help you deploy your advanced POS system to DigitalOcean with all the latest features and fixes.

## 🚀 Prerequisites

### Required Accounts
- **DigitalOcean Account** (sign up at https://digitalocean.com)
- **Domain Name** (optional, but recommended for SSL)
- **GitHub Account** (for code deployment)

### Local Requirements
- **Node.js 18+** installed locally
- **Git** installed
- **SSH client** (built into most systems)

## 📋 Step 1: Create DigitalOcean Droplet

### 1.1 Create New Droplet
1. **Login to DigitalOcean**
2. **Click "Create" → "Droplets"**
3. **Choose Configuration:**
   - **Image:** Ubuntu 22.04 LTS
   - **Size:** Basic Plan, $12/month (2GB RAM, 1 CPU, 50GB SSD) - **Recommended**
   - **Authentication:** SSH Key (recommended) or Password
   - **Hostname:** `pos-server` (or your preferred name)
   - **Region:** Choose closest to your location

### 1.2 SSH Key Setup (Recommended)
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to clipboard
cat ~/.ssh/id_rsa.pub
```
- **Add SSH key** to DigitalOcean account
- **Select the key** when creating droplet

## 🔧 Step 2: Server Setup

### 2.1 Connect to Your Droplet
```bash
# Replace with your droplet's IP address
ssh root@YOUR_DROPLET_IP

# Or if using SSH key
ssh root@YOUR_DROPLET_IP
```

### 2.2 Update System
```bash
# Update package list
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx certbot python3-certbot-nginx sqlite3
```

### 2.3 Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.4 Install PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 startup script
pm2 startup
```

## 📦 Step 3: Deploy Your Application

### 3.1 Upload Your Code

#### Option A: Direct Upload (Simple)
```bash
# Create application directory
mkdir -p /var/www/pos-system
cd /var/www/pos-system

# Upload your files using SCP
# From your local machine:
scp -r /path/to/your/pos-project/* root@YOUR_DROPLET_IP:/var/www/pos-system/
```

#### Option B: Git Deployment (Recommended)
```bash
# Create application directory
mkdir -p /var/www/pos-system
cd /var/www/pos-system

# Initialize git repository
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if you haven't created a repo yet:
# 1. Create a new repository on GitHub
# 2. Upload your code to GitHub
# 3. Then clone it here
```

### 3.2 Install Dependencies
```bash
cd /var/www/pos-system

# Install production dependencies
npm install --production

# Build the React application
npm run build
```

## ⚙️ Step 4: Configure Production Environment

### 4.1 Create Production Configuration
```bash
# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_PATH=/var/www/pos-system/pos_database.db
SESSION_SECRET=your-super-secret-session-key-change-this-$(openssl rand -hex 32)
EOF
```

### 4.2 Update Server Configuration
The server.js file already includes all necessary production configurations:
- **Database path detection** (Electron vs fallback)
- **Enhanced logging** for debugging
- **Import/Export API endpoints** with progress tracking
- **Authentication middleware** with proper session handling
- **Error handling** and graceful shutdown

### 4.3 Database Initialization
The server automatically:
- **Creates all necessary tables** (inventory, sales, users, settings, etc.)
- **Inserts default admin user** (username: `admin`, password: `iamjust007`)
- **Sets up proper indexes** and constraints
- **Handles database migrations** automatically

## 🌐 Step 5: Configure Nginx (Reverse Proxy)

### 5.1 Create Nginx Configuration
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/pos-system << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Increase client body size for large imports
    client_max_body_size 50M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 5.2 Enable Site and Restart Nginx
```bash
# Enable the site
ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

## 🔒 Step 6: SSL Certificate (Optional but Recommended)

### 6.1 Install SSL Certificate
```bash
# Install SSL certificate with Let's Encrypt
certbot --nginx -d YOUR_DOMAIN_NAME

# Or if you don't have a domain, skip this step
# You can still access via IP address
```

## 🚀 Step 7: Start Your Application

### 7.1 Create PM2 Configuration
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'pos-system',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs
```

### 7.2 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs pos-system
```

## 🔧 Step 8: Firewall Configuration

### 8.1 Configure UFW Firewall
```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow ssh

# Allow HTTP
ufw allow 80

# Allow HTTPS
ufw allow 443

# Allow Node.js port (if accessing directly)
ufw allow 3001

# Check status
ufw status
```

## 📊 Step 9: Monitoring and Maintenance

### 9.1 Set Up Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 9.2 Create Backup Script
```bash
# Create backup script
cat > /var/www/pos-system/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/pos-system"
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/pos-system/pos_database.db $BACKUP_DIR/pos_database_$DATE.db

# Create JSON export backup
cd /var/www/pos-system
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('pos_database.db');
const fs = require('fs');

// Export all data to JSON
const exportData = async () => {
  const data = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      platform: 'server'
    },
    data: {}
  };

  // Export each table
  const tables = ['inventory', 'sales', 'users', 'settings', 'customer_offers', 'stock_adjustments', 'audit_sessions', 'final_bills'];
  
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.all(\`SELECT * FROM \${table}\`, (err, rows) => {
        if (err) reject(err);
        else {
          data.data[table] = rows;
          resolve();
        }
      });
    });
  }

  fs.writeFileSync(\`$BACKUP_DIR/pos_backup_\$DATE.json\`, JSON.stringify(data, null, 2));
  console.log('JSON backup created:', \`pos_backup_\$DATE.json\`);
  db.close();
};

exportData().catch(console.error);
"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "pos_database_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "pos_backup_*.json" -mtime +7 -delete

echo "Backup completed: pos_database_$DATE.db and pos_backup_$DATE.json"
EOF

chmod +x /var/www/pos-system/backup.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/pos-system/backup.sh") | crontab -
```

## 🌍 Step 10: Access Your Application

### 10.1 Access Methods
- **Via Domain:** `https://yourdomain.com` (if SSL configured)
- **Via IP:** `http://YOUR_DROPLET_IP` (if no SSL)
- **Direct Port:** `http://YOUR_DROPLET_IP:3001` (if firewall allows)

### 10.2 Default Login
- **Username:** `admin`
- **Password:** `iamjust007`
- **⚠️ Change these credentials immediately!**

## 🔄 Step 11: Data Migration from Windows

### 11.1 Export Data from Windows
1. **Start your Windows POS system**
2. **Login as admin**
3. **Go to Settings → Export Data**
4. **Download the JSON backup file**

### 11.2 Import Data to Cloud
1. **Access your cloud POS system**
2. **Login as admin**
3. **Go to Settings → Import Data**
4. **Select the JSON backup file**
5. **Choose import options** (skip users, sales, settings if needed)
6. **Click Import Data**
7. **Watch the progress bar** - it will show detailed progress

### 11.3 Alternative: Direct Database Replacement
If import doesn't work, you can replace the database file directly:

```bash
# Stop the application
pm2 stop pos-system

# Backup current database
cp /var/www/pos-system/pos_database.db /var/www/pos-system/pos_database-backup.db

# Replace with Windows database (upload first)
cp /path/to/windows/pos-database.db /var/www/pos-system/pos_database.db

# Set proper permissions
chown root:root /var/www/pos-system/pos_database.db
chmod 644 /var/www/pos-system/pos_database.db

# Start the application
pm2 start pos-system
```

## 🔄 Step 12: Updates and Maintenance

### 12.1 Update Application
```bash
# Connect to server
ssh root@YOUR_DROPLET_IP

# Navigate to app directory
cd /var/www/pos-system

# Pull latest changes (if using Git)
git pull origin main

# Install new dependencies
npm install --production

# Rebuild application
npm run build

# Restart application
pm2 restart pos-system
```

### 12.2 Monitor Application
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs pos-system

# Monitor resources
pm2 monit

# Check Nginx status
systemctl status nginx

# Check disk space
df -h
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check PM2 logs
pm2 logs pos-system

# Check if port is in use
netstat -tulpn | grep :3001

# Restart PM2
pm2 restart pos-system
```

#### 2. Import Data Not Working
```bash
# Check server logs for import errors
pm2 logs pos-system | grep -i import

# Verify database permissions
ls -la /var/www/pos-system/pos_database.db

# Check database integrity
sqlite3 /var/www/pos-system/pos_database.db "PRAGMA integrity_check;"
```

#### 3. Nginx Issues
```bash
# Check Nginx configuration
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

#### 4. Database Issues
```bash
# Check database file permissions
ls -la /var/www/pos-system/pos_database.db

# Check database integrity
sqlite3 /var/www/pos-system/pos_database.db "PRAGMA integrity_check;"

# Check database size
du -h /var/www/pos-system/pos_database.db
```

#### 5. SSL Certificate Issues
```bash
# Renew SSL certificate
certbot renew --dry-run

# Check certificate status
certbot certificates
```

## 💰 Cost Estimation

### DigitalOcean Droplet Costs
- **Basic Droplet:** $6/month (1GB RAM, 1 CPU, 25GB SSD)
- **Standard Droplet:** $12/month (2GB RAM, 1 CPU, 50GB SSD) - **Recommended**
- **CPU-Optimized:** $18/month (2GB RAM, 2 CPU, 50GB SSD) - For high traffic
- **Domain:** $10-15/year (optional)
- **SSL Certificate:** Free with Let's Encrypt

### Total Monthly Cost
- **Basic Setup:** $6/month
- **With Domain:** $7/month
- **Recommended Setup:** $12/month
- **High Traffic Setup:** $18/month

## 🔐 Security Best Practices

### 1. Change Default Credentials
```bash
# Access your application and change admin password
# Create additional users with appropriate roles
```

### 2. Regular Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js dependencies
npm audit fix
```

### 3. Database Backups
```bash
# Run backup script manually
/var/www/pos-system/backup.sh

# Check cron job
crontab -l
```

### 4. Monitor Access
```bash
# Check access logs
tail -f /var/log/nginx/access.log

# Monitor failed login attempts
grep "401\|403" /var/log/nginx/access.log
```

## 📞 Support

### Getting Help
1. **Check PM2 logs:** `pm2 logs pos-system`
2. **Check Nginx logs:** `tail -f /var/log/nginx/error.log`
3. **Verify services:** `systemctl status nginx`
4. **Check disk space:** `df -h`
5. **Monitor resources:** `htop` or `pm2 monit`

### Useful Commands
```bash
# Restart all services
pm2 restart all
systemctl restart nginx

# Check application status
pm2 status
systemctl status nginx

# View real-time logs
pm2 logs pos-system --lines 100

# Monitor system resources
htop
```

## 🎯 Application Features Overview

### Core Features
- **Inventory Management**: Complete product catalog with barcode support
- **Sales Processing**: Advanced billing with mixed payments (cash + online)
- **Customer Management**: Customer profiles with birthday tracking
- **Receipt Generation**: Professional receipt printing
- **Sales Reports**: Comprehensive analytics and reporting
- **Stock Management**: Real-time inventory tracking
- **Pricing System**: Flexible pricing with discount tiers
- **Data Import/Export**: Full backup and restore functionality

### Advanced Features
- **Barcode Scanning**: Support for barcode input and scanning
- **Customer Offers**: Create and manage customer-specific discounts
- **Bundle Pricing**: Automatic bundle pricing for multiple items
- **Tax Calculation**: Built-in GST calculation (5%)
- **Print Confirmation**: Optional receipt printing after sale completion
- **Excel Import**: Bulk inventory import from Excel files
- **Network Support**: Multi-device synchronization
- **Stock Audit**: Comprehensive stock auditing system
- **User Management**: Role-based access control (admin/cashier)

### Technical Features
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Database**: SQLite for reliable data storage
- **API**: RESTful API for all operations
- **Authentication**: Session-based authentication
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live inventory and sales updates
- **Backup System**: Automated daily backups
- **Error Handling**: Comprehensive error handling and logging

---

## 🎯 Quick Deployment Checklist

- [ ] Create DigitalOcean droplet
- [ ] Install Node.js and dependencies
- [ ] Upload your code
- [ ] Build React application
- [ ] Configure Nginx
- [ ] Set up PM2
- [ ] Configure firewall
- [ ] Test application access
- [ ] Set up SSL (optional)
- [ ] Configure backups
- [ ] Change default credentials
- [ ] Import data from Windows
- [ ] Monitor application

**Your advanced POS system is now live on DigitalOcean! 🎉**

Access it at: `http://YOUR_DROPLET_IP` or `https://yourdomain.com`

**Default Login:** `admin` / `iamjust007` (change immediately!)