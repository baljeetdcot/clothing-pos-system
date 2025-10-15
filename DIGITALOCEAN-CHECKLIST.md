# DigitalOcean Deployment Checklist (Updated 2024)

## ✅ Pre-Deployment Checklist

### 1. DigitalOcean Account Setup
- [ ] Create DigitalOcean account
- [ ] Add payment method
- [ ] Generate SSH key pair (optional but recommended)
- [ ] Note your droplet IP address

### 2. Domain Setup (Optional)
- [ ] Purchase domain name
- [ ] Point domain to DigitalOcean droplet IP
- [ ] Wait for DNS propagation (up to 48 hours)

### 3. Local Preparation
- [ ] Test production build locally: `test-production.bat`
- [ ] Verify all features work in production mode
- [ ] Backup your local database
- [ ] Export data from Windows: Settings → Export Data
- [ ] Prepare your code for upload

## 🚀 Deployment Steps

### Step 1: Create Droplet
- [ ] Login to DigitalOcean
- [ ] Create new droplet
- [ ] Choose Ubuntu 22.04 LTS
- [ ] Select $12/month plan (2GB RAM) - **Recommended**
- [ ] Add SSH key or set password
- [ ] Create droplet

### Step 2: Server Setup
- [ ] Connect to droplet: `ssh root@YOUR_DROPLET_IP`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Install packages: `apt install -y curl wget git nginx certbot python3-certbot-nginx sqlite3`
- [ ] Install Node.js 18.x
- [ ] Install PM2: `npm install -g pm2`
- [ ] Configure PM2 startup: `pm2 startup`

### Step 3: Upload Application
Choose one method:

#### Option A: Direct Upload
- [ ] Create directory: `mkdir -p /var/www/pos-system`
- [ ] Upload files: `scp -r /path/to/your/pos-project/* root@YOUR_DROPLET_IP:/var/www/pos-system/`

#### Option B: Git Deployment
- [ ] Create GitHub repository
- [ ] Upload your code to GitHub
- [ ] Clone on server: `git clone https://github.com/your-repo.git /var/www/pos-system/`

### Step 4: Install and Build
- [ ] Navigate to app: `cd /var/www/pos-system`
- [ ] Install dependencies: `npm install --production`
- [ ] Build React app: `npm run build`
- [ ] Create environment file with secure session secret
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Save PM2 config: `pm2 save`

### Step 5: Configure Nginx
- [ ] Create Nginx configuration file
- [ ] Enable site: `ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/`
- [ ] Remove default site: `rm -f /etc/nginx/sites-enabled/default`
- [ ] Test configuration: `nginx -t`
- [ ] Restart Nginx: `systemctl restart nginx`
- [ ] Enable Nginx: `systemctl enable nginx`

### Step 6: Configure SSL (Optional)
- [ ] Install SSL certificate: `certbot --nginx -d yourdomain.com`
- [ ] Test SSL: `https://yourdomain.com`

### Step 7: Configure Firewall
- [ ] Enable UFW: `ufw enable`
- [ ] Allow SSH: `ufw allow ssh`
- [ ] Allow HTTP: `ufw allow 80`
- [ ] Allow HTTPS: `ufw allow 443`
- [ ] Check status: `ufw status`

### Step 8: Set Up Monitoring
- [ ] Install PM2 logrotate: `pm2 install pm2-logrotate`
- [ ] Configure log rotation
- [ ] Create backup script
- [ ] Set up daily backups with cron
- [ ] Test backup script

## 🔧 Post-Deployment Verification

### Basic Checks
- [ ] Application loads: `http://YOUR_DROPLET_IP` or `https://yourdomain.com`
- [ ] Login works with admin/iamjust007
- [ ] All pages load correctly
- [ ] Database operations work
- [ ] Mixed payments work correctly
- [ ] Import/Export functionality works

### Performance Checks
- [ ] Check PM2 status: `pm2 status`
- [ ] Monitor logs: `pm2 logs pos-system`
- [ ] Check Nginx status: `systemctl status nginx`
- [ ] Monitor resources: `htop`
- [ ] Check disk space: `df -h`

### Security Checks
- [ ] Change default admin password
- [ ] Create additional users
- [ ] Verify firewall: `ufw status`
- [ ] Check SSL certificate (if configured)
- [ ] Verify database permissions

## 📊 Data Migration from Windows

### Export from Windows
- [ ] Start Windows POS system
- [ ] Login as admin
- [ ] Go to Settings → Export Data
- [ ] Download JSON backup file
- [ ] Verify backup file contains all data

### Import to Cloud
- [ ] Access cloud POS system
- [ ] Login as admin
- [ ] Go to Settings → Import Data
- [ ] Select JSON backup file
- [ ] Choose import options
- [ ] Watch progress bar during import
- [ ] Verify all data imported correctly

### Alternative: Direct Database Replacement
- [ ] Stop application: `pm2 stop pos-system`
- [ ] Backup current database
- [ ] Upload Windows database file
- [ ] Replace database file
- [ ] Set proper permissions
- [ ] Start application: `pm2 start pos-system`

## 📊 Monitoring Setup

### Daily Monitoring
- [ ] Check application status: `pm2 status`
- [ ] Review logs: `pm2 logs pos-system --lines 50`
- [ ] Check disk space: `df -h`
- [ ] Verify backups: `ls -la /var/backups/pos-system/`
- [ ] Monitor resources: `htop`

### Weekly Tasks
- [ ] Update system packages: `apt update && apt upgrade -y`
- [ ] Update Node.js dependencies: `npm audit fix`
- [ ] Test backup restore procedure
- [ ] Review access logs for security
- [ ] Check SSL certificate status

## 🛠️ Maintenance Commands

### Application Management
```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop pos-system

# Restart application
pm2 restart pos-system

# View logs
pm2 logs pos-system

# Monitor resources
pm2 monit

# Check status
pm2 status
```

### System Management
```bash
# Check system status
systemctl status nginx
systemctl status pm2-root

# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop
```

### Database Management
```bash
# Check database file
ls -la /var/www/pos-system/pos_database.db

# Check database integrity
sqlite3 /var/www/pos-system/pos_database.db "PRAGMA integrity_check;"

# Check database size
du -h /var/www/pos-system/pos_database.db

# Backup database
cp /var/www/pos-system/pos_database.db /var/backups/pos-system/backup_$(date +%Y%m%d).db
```

### Nginx Management
```bash
# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# Check status
systemctl status nginx

# View logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## 🔒 Security Checklist

### Initial Security
- [ ] Change default admin password
- [ ] Create strong session secret
- [ ] Configure firewall rules
- [ ] Set up SSL certificate
- [ ] Enable automatic security updates
- [ ] Create additional user accounts
- [ ] Set up proper file permissions

### Ongoing Security
- [ ] Regular system updates
- [ ] Monitor access logs
- [ ] Review user accounts
- [ ] Backup database regularly
- [ ] Test restore procedures
- [ ] Monitor failed login attempts
- [ ] Review security headers

## 📈 Performance Optimization

### Server Optimization
- [ ] Enable gzip compression (already configured)
- [ ] Set up caching headers (already configured)
- [ ] Monitor resource usage
- [ ] Optimize database queries
- [ ] Consider upgrading droplet if needed
- [ ] Set up log rotation

### Application Optimization
- [ ] Monitor PM2 logs for errors
- [ ] Optimize React build
- [ ] Implement database indexing
- [ ] Monitor memory usage
- [ ] Check for memory leaks
- [ ] Optimize import/export operations

## 🚨 Troubleshooting

### Common Issues
- [ ] Application won't start → Check PM2 logs
- [ ] Nginx errors → Check configuration
- [ ] Database issues → Verify file permissions
- [ ] SSL problems → Check certificate status
- [ ] Performance issues → Monitor resources
- [ ] Import fails → Check server logs
- [ ] Login issues → Verify credentials

### Emergency Procedures
- [ ] Restart all services: `pm2 restart all && systemctl restart nginx`
- [ ] Check system resources: `htop`
- [ ] Review error logs: `pm2 logs pos-system --err`
- [ ] Check database integrity
- [ ] Restore from backup if needed
- [ ] Contact support if issues persist

### Debug Commands
```bash
# Check application status
pm2 status
pm2 logs pos-system

# Check system resources
htop
df -h
free -h

# Check network
netstat -tulpn | grep :3001
ss -tulpn | grep :3001

# Check database
sqlite3 /var/www/pos-system/pos_database.db "SELECT COUNT(*) FROM inventory;"

# Check Nginx
nginx -t
systemctl status nginx
```

## 📞 Support Resources

### Documentation
- [ ] DigitalOcean Documentation
- [ ] PM2 Documentation
- [ ] Nginx Documentation
- [ ] Node.js Documentation
- [ ] SQLite Documentation

### Monitoring Tools
- [ ] PM2 Web Dashboard (optional)
- [ ] DigitalOcean Monitoring
- [ ] Custom monitoring scripts
- [ ] Log analysis tools

### Backup and Recovery
- [ ] Daily automated backups
- [ ] Manual backup procedures
- [ ] Restore procedures
- [ ] Disaster recovery plan

---

## 🎯 Quick Start Summary

1. **Create DigitalOcean droplet** ($12/month recommended)
2. **Set up server** with Node.js, PM2, and Nginx
3. **Upload your code** to `/var/www/pos-system/`
4. **Install dependencies** and build app
5. **Configure Nginx** and SSL
6. **Start with PM2** and configure monitoring
7. **Import data** from Windows system
8. **Access your POS** at `http://YOUR_IP` or `https://yourdomain.com`
9. **Login** with admin/iamjust007
10. **Change password** and start using!

**Total setup time: 60-90 minutes**
**Monthly cost: $12 + domain (optional)**

## 🎉 Success Indicators

Your deployment is successful when:
- [ ] Application loads without errors
- [ ] Login works with correct credentials
- [ ] All features function properly
- [ ] Data imports successfully
- [ ] SSL certificate works (if configured)
- [ ] Backups are running automatically
- [ ] Monitoring is set up
- [ ] Performance is acceptable

**Your advanced POS system is now live in the cloud! 🚀**