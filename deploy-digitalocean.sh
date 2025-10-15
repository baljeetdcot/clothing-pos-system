#!/bin/bash

# POS System - DigitalOcean Deployment Script
# This script automates the deployment process on a DigitalOcean droplet

set -e  # Exit on any error

echo "=========================================="
echo "POS System - DigitalOcean Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Get droplet IP and domain
read -p "Enter your droplet IP address: " DROPLET_IP
read -p "Enter your domain name (or press Enter to skip): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    DOMAIN_NAME=$DROPLET_IP
fi

print_status "Starting deployment for $DOMAIN_NAME ($DROPLET_IP)"

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

# Install Node.js
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "npm version: $NPM_VERSION"

# Install PM2
print_status "Installing PM2 process manager..."
npm install -g pm2

# Create application directory
print_status "Creating application directory..."
mkdir -p /var/www/pos-system
cd /var/www/pos-system

# Create logs directory
mkdir -p logs

# Set proper permissions
chown -R www-data:www-data /var/www/pos-system
chmod -R 755 /var/www/pos-system

print_status "Application directory created at /var/www/pos-system"

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_PATH=/var/www/pos-system/pos_database.db
SESSION_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=http://$DOMAIN_NAME,https://$DOMAIN_NAME
EOF

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/pos-system << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

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

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable Nginx site
print_status "Configuring Nginx..."
ln -sf /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3001

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/pos-system"
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "/var/www/pos-system/pos_database.db" ]; then
    cp /var/www/pos-system/pos_database.db $BACKUP_DIR/pos_database_$DATE.db
    echo "Backup completed: pos_database_$DATE.db"
else
    echo "No database file found to backup"
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "pos_database_*.db" -mtime +7 -delete
EOF

chmod +x backup.sh

# Set up daily backups
print_status "Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/pos-system/backup.sh") | crontab -

# Create deployment script
print_status "Creating deployment script..."
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "Deploying POS System..."

# Pull latest changes (if using Git)
# git pull origin main

# Install dependencies
npm install --production

# Build React app
npm run build

# Restart application
pm2 restart pos-system

echo "Deployment completed!"
EOF

chmod +x deploy.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== POS System Status ==="
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l
echo ""
echo "Disk Usage:"
df -h
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Recent Logs:"
pm2 logs pos-system --lines 10
EOF

chmod +x monitor.sh

# Install PM2 log rotation
print_status "Setting up log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

print_status "Server setup completed!"
print_warning "IMPORTANT: You need to upload your application files to /var/www/pos-system/"
print_warning "You can do this by:"
print_warning "1. Using SCP: scp -r /path/to/your/pos-project/* root@$DROPLET_IP:/var/www/pos-system/"
print_warning "2. Using Git: git clone https://github.com/your-repo.git /var/www/pos-system/"
print_warning "3. Using SFTP or any file transfer method"

echo ""
print_status "Next steps:"
echo "1. Upload your application files to /var/www/pos-system/"
echo "2. Run: cd /var/www/pos-system && npm install --production"
echo "3. Run: npm run build"
echo "4. Run: pm2 start ecosystem.config.js"
echo "5. Run: pm2 save"
echo "6. Access your application at: http://$DOMAIN_NAME"

if [ "$DOMAIN_NAME" != "$DROPLET_IP" ]; then
    echo ""
    print_status "To set up SSL certificate:"
    echo "Run: certbot --nginx -d $DOMAIN_NAME"
fi

echo ""
print_status "Useful commands:"
echo "- Monitor: ./monitor.sh"
echo "- Deploy updates: ./deploy.sh"
echo "- Backup: ./backup.sh"
echo "- PM2 logs: pm2 logs pos-system"
echo "- PM2 status: pm2 status"

echo ""
print_status "Deployment script completed successfully!"
echo "=========================================="
