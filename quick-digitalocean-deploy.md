# Quick DigitalOcean Deployment Guide

## 🚀 Fast Deployment Steps

### 1. Create Droplet
- **Image**: Ubuntu 22.04 LTS
- **Size**: $12/month (2GB RAM, 1 CPU, 50GB SSD)
- **Region**: Choose closest to you
- **Authentication**: SSH Key (recommended)

### 2. Connect to Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 3. Quick Setup Script
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Create app directory
mkdir -p /var/www/pos-system
cd /var/www/pos-system
```

### 4. Deploy Your Code
```bash
# Clone your repository
git clone https://github.com/your-username/your-pos-repo.git .

# Install dependencies
npm install

# Build the app
npm run build

# Start with PM2
pm2 start server.js --name "pos-system"
pm2 startup
pm2 save
```

### 5. Configure Nginx
```bash
# Create Nginx config
cat > /etc/nginx/sites-available/pos-system << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

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
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 6. Setup SSL (Optional)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

## 🔧 Environment Variables
Set these in your PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'pos-system',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

## 📊 Monitoring
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs pos-system

# Restart app
pm2 restart pos-system
```

## 🌐 Access Your App
- **HTTP**: http://YOUR_DROPLET_IP
- **HTTPS**: https://your-domain.com (if SSL configured)

## 💰 Cost
- **Droplet**: $12/month
- **Domain**: $10-15/year (optional)
- **Total**: ~$12-15/month
