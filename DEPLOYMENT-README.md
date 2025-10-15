# DigitalOcean Deployment Files

This directory contains all the files needed to deploy your POS system to DigitalOcean.

## 📁 Files Overview

### Core Deployment Files
- **`DIGITALOCEAN-DEPLOYMENT.md`** - Complete step-by-step deployment guide
- **`DIGITALOCEAN-CHECKLIST.md`** - Deployment checklist and maintenance guide
- **`deploy-digitalocean.sh`** - Automated deployment script for Ubuntu server
- **`server-production.js`** - Production-ready server configuration
- **`ecosystem.config.js`** - PM2 process manager configuration

### Local Testing Files
- **`test-production.bat`** - Test production build locally on Windows
- **`package.json`** - Updated with production deployment scripts

## 🚀 Quick Start

### 1. Test Locally First
```bash
# Test production build on Windows
test-production.bat
```

### 2. Deploy to DigitalOcean
1. Create a DigitalOcean droplet (Ubuntu 22.04)
2. Upload `deploy-digitalocean.sh` to your server
3. Run the deployment script
4. Upload your application files
5. Start the application

### 3. Access Your POS
- **Via IP:** `http://YOUR_DROPLET_IP`
- **Via Domain:** `https://yourdomain.com` (if SSL configured)
- **Login:** admin / admin123 (change immediately!)

## 📋 What's Included

### Production Server Features
- ✅ Optimized for production environment
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ SSL certificate support
- ✅ Automatic backups
- ✅ Log rotation
- ✅ Security headers
- ✅ Gzip compression
- ✅ Static file caching

### Deployment Script Features
- ✅ Automatic system updates
- ✅ Node.js installation
- ✅ PM2 installation and configuration
- ✅ Nginx configuration
- ✅ Firewall setup
- ✅ SSL certificate setup
- ✅ Backup system
- ✅ Monitoring scripts

## 🔧 Configuration

### Environment Variables
The deployment script creates a `.env` file with:
```env
NODE_ENV=production
PORT=3001
DB_PATH=/var/www/pos-system/pos_database.db
SESSION_SECRET=auto-generated-secret
ALLOWED_ORIGINS=http://yourdomain.com,https://yourdomain.com
```

### PM2 Configuration
- **Process name:** pos-system
- **Auto-restart:** Enabled
- **Memory limit:** 1GB
- **Log rotation:** 10MB files, 7 days retention
- **Error handling:** Graceful shutdown

### Nginx Configuration
- **Security headers:** XSS protection, CSRF protection
- **Gzip compression:** Enabled
- **Static file caching:** 1 year
- **Proxy timeout:** 24 hours
- **SSL support:** Ready for Let's Encrypt

## 📊 Monitoring

### Built-in Monitoring
- **PM2 monitoring:** `pm2 monit`
- **System monitoring:** `./monitor.sh`
- **Log viewing:** `pm2 logs pos-system`
- **Status checking:** `pm2 status`

### Automated Tasks
- **Daily backups:** Database backed up at 2 AM
- **Log rotation:** Automatic cleanup
- **System updates:** Manual (recommended weekly)

## 🛠️ Maintenance

### Regular Tasks
```bash
# Check application status
./monitor.sh

# Deploy updates
./deploy.sh

# Create manual backup
./backup.sh

# View logs
pm2 logs pos-system
```

### Update Process
1. Upload new code to server
2. Run `./deploy.sh`
3. Verify application works
4. Monitor for issues

## 🔒 Security

### Implemented Security
- ✅ Secure session management
- ✅ CORS configuration
- ✅ Security headers
- ✅ Firewall configuration
- ✅ SSL certificate support
- ✅ Input validation
- ✅ SQL injection protection

### Security Checklist
- [ ] Change default admin password
- [ ] Create strong session secret
- [ ] Configure SSL certificate
- [ ] Set up regular backups
- [ ] Monitor access logs
- [ ] Keep system updated

## 💰 Cost Breakdown

### DigitalOcean Droplet
- **Basic:** $6/month (1GB RAM, 1 CPU, 25GB SSD)
- **Standard:** $12/month (2GB RAM, 1 CPU, 50GB SSD) - Recommended
- **CPU-Optimized:** $18/month (2GB RAM, 2 CPU, 25GB SSD)

### Additional Costs
- **Domain:** $10-15/year (optional)
- **SSL Certificate:** Free (Let's Encrypt)
- **Backup Storage:** Included in droplet

### Total Monthly Cost
- **Basic Setup:** $6/month
- **With Domain:** $7/month
- **Recommended:** $12/month

## 📞 Support

### Getting Help
1. Check the deployment guide: `DIGITALOCEAN-DEPLOYMENT.md`
2. Use the checklist: `DIGITALOCEAN-CHECKLIST.md`
3. Check PM2 logs: `pm2 logs pos-system`
4. Monitor system: `./monitor.sh`

### Common Issues
- **Application won't start:** Check PM2 logs
- **Nginx errors:** Check configuration with `nginx -t`
- **Database issues:** Verify file permissions
- **SSL problems:** Check certificate status

---

## 🎯 Ready to Deploy?

1. **Read the full guide:** `DIGITALOCEAN-DEPLOYMENT.md`
2. **Follow the checklist:** `DIGITALOCEAN-CHECKLIST.md`
3. **Test locally first:** `test-production.bat`
4. **Deploy to DigitalOcean:** Use `deploy-digitalocean.sh`

Your POS system will be live in the cloud in under an hour! 🚀
