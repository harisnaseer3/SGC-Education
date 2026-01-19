# SGC Education - Deployment Guide

This guide will help you deploy the SGC Education application on a production server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Process Management (PM2)](#process-management-pm2)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Prerequisites

### Server Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (recommended)
- **RAM**: Minimum 2GB (4GB+ recommended)
- **CPU**: 2+ cores
- **Storage**: 20GB+ free space
- **Node.js**: v18.x or v20.x
- **MongoDB**: v6.0 or later
- **Nginx**: Latest stable version
- **PM2**: For process management

### Software Installation

#### 1. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

#### 2. Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Install MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

#### 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 5. Install PM2

```bash
sudo npm install -g pm2
```

#### 6. Install Git

```bash
sudo apt install -y git
```

---

## Server Setup

### 1. Create Application User

```bash
# Create a dedicated user for the application
sudo adduser --disabled-password --gecos "" sgcuser
sudo usermod -aG sudo sgcuser

# Switch to the new user
su - sgcuser
```

### 2. Create Application Directory

```bash
# Create directory structure
sudo mkdir -p /var/www/sgceducation
sudo chown -R sgcuser:sgcuser /var/www/sgceducation
cd /var/www/sgceducation
```

### 3. Clone or Upload Application

**Option A: Using Git**

```bash
git clone <your-repository-url> .
```

**Option B: Using SCP/SFTP**

```bash
# From your local machine
scp -r /path/to/SGCEducation/* user@server:/var/www/sgceducation/
```

---

## Database Setup

### 1. Secure MongoDB

```bash
# Access MongoDB shell
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password_here",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

# Create application database user
use sgceducation
db.createUser({
  user: "sgcuser",
  pwd: "your_database_password_here",
  roles: [ { role: "readWrite", db: "sgceducation" } ]
})

# Exit MongoDB shell
exit
```

### 2. Enable MongoDB Authentication

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf
```

Add/modify the following:

```yaml
security:
  authorization: enabled
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

### 3. Test MongoDB Connection

```bash
mongosh -u sgcuser -p your_database_password_here --authenticationDatabase sgceducation
```

---

## Application Deployment

### 1. Install Dependencies

```bash
cd /var/www/sgceducation

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Return to root
cd ..
```

### 2. Build Frontend

```bash
cd client
npm run build
cd ..
```

The build output will be in `client/build/` directory.

### 3. Configure Environment Variables

#### Backend Environment (.env)

```bash
cd server
cp env.example .env
nano .env
```

Update the `.env` file with production values:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://sgcuser:your_database_password_here@localhost:27017/sgceducation?authSource=sgceducation

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_characters_long

# CORS Configuration (if needed)
CORS_ORIGIN=https://yourdomain.com
```

**Important**: 
- Generate a strong JWT_SECRET (minimum 32 characters)
- Use a secure MongoDB connection string
- Never commit `.env` file to version control

#### Frontend Environment

Create `client/.env.production`:

```bash
cd client
nano .env.production
```

Add:

```env
REACT_APP_API_URL=https://yourdomain.com/api/v1
```

**Note**: The application includes a centralized API configuration file at `client/src/config/api.js` that uses this environment variable. Most components should be updated to use this configuration instead of hardcoded URLs. See the "Updating API URLs" section below for details.

### 4. Update API Base URL in Frontend

The application includes a centralized API configuration file at `client/src/config/api.js`. However, some components may still use hardcoded URLs. 

**Option 1: Quick Fix (Recommended for Production)**

Before building, you can do a find-and-replace in the `client/src` directory:

```bash
cd client/src
# Replace all hardcoded localhost URLs (be careful with this)
find . -type f -name "*.js" -exec sed -i 's|http://localhost:5000/api/v1|process.env.REACT_APP_API_URL || "https://yourdomain.com/api/v1"|g' {} +
```

**Option 2: Manual Update (Recommended for Long-term)**

Update components to use the centralized API config:

1. Import the API config:
```javascript
import { getApiUrl } from '../config/api';
// or
import API_BASE_URL from '../config/api';
```

2. Replace hardcoded URLs:
```javascript
// Before
const response = await axios.get('http://localhost:5000/api/v1/users', {...});

// After
const response = await axios.get(getApiUrl('users'), {...});
// or
const response = await axios.get(`${API_BASE_URL}/users`, {...});
```

**Note**: The `InstitutionSwitcher` component already uses environment variables correctly as an example.

---

## Process Management (PM2)

### 1. Create PM2 Ecosystem File

```bash
cd /var/www/sgceducation
nano ecosystem.config.js
```

Add the following configuration:

```javascript
module.exports = {
  apps: [{
    name: 'sgc-education-api',
    script: './server/server.js',
    instances: 2, // Use 2 instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 2. Create Logs Directory

```bash
mkdir -p logs
```

### 3. Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

The last command will output a command to run with sudo - run it to enable PM2 on system startup.

### 4. PM2 Useful Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs sgc-education-api

# Restart application
pm2 restart sgc-education-api

# Stop application
pm2 stop sgc-education-api

# Monitor
pm2 monit
```

---

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/sgceducation
```

Add the following configuration:

```nginx
# Upstream for Node.js backend
upstream backend {
    server localhost:5000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (will be updated after SSL setup)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/sgceducation-access.log;
    error_log /var/log/nginx/sgceducation-error.log;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;

    # Serve React build files
    root /var/www/sgceducation/client/build;
    index index.html;

    # API Proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Serve static files from React build
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/sgceducation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/HTTPS Setup

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to complete the SSL setup.

### 3. Auto-renewal

Certbot automatically sets up auto-renewal. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Security Considerations

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. MongoDB Security

- Enable authentication (already done)
- Bind MongoDB to localhost only (default)
- Regularly update MongoDB
- Use strong passwords

### 3. Application Security

- Keep Node.js and dependencies updated
- Use strong JWT secrets
- Implement rate limiting (consider adding `express-rate-limit`)
- Regularly review and update dependencies
- Use environment variables for all secrets

### 4. File Permissions

```bash
# Set proper permissions
sudo chown -R sgcuser:sgcuser /var/www/sgceducation
chmod -R 755 /var/www/sgceducation
chmod 600 /var/www/sgceducation/server/.env
```

### 5. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /var/www/sgceducation
npm audit fix
cd client && npm audit fix
cd ../server && npm audit fix
```

---

## Troubleshooting

### 1. Application Not Starting

```bash
# Check PM2 logs
pm2 logs sgc-education-api

# Check if port is in use
sudo netstat -tulpn | grep 5000

# Check MongoDB connection
mongosh -u sgcuser -p your_password --authenticationDatabase sgceducation
```

### 2. Nginx Errors

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/sgceducation-error.log
sudo tail -f /var/log/nginx/sgceducation-access.log
```

### 3. MongoDB Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### 4. Frontend Not Loading

- Check if build was successful: `ls -la client/build/`
- Verify Nginx root points to `client/build`
- Check browser console for errors
- Verify API URL in frontend environment variables

### 5. API Not Responding

- Check PM2 status: `pm2 status`
- Verify backend is running: `curl http://localhost:5000/api/v1/health`
- Check CORS configuration
- Verify environment variables

---

## Maintenance

### 1. Application Updates

```bash
cd /var/www/sgceducation

# Pull latest changes (if using Git)
git pull origin main

# Install/update dependencies
npm install
cd client && npm install && npm run build
cd ../server && npm install

# Restart application
pm2 restart sgc-education-api
```

### 2. Database Backups

Create a backup script:

```bash
nano /var/www/sgceducation/backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://sgcuser:your_password@localhost:27017/sgceducation?authSource=sgceducation" --out=$BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Make executable:

```bash
chmod +x /var/www/sgceducation/backup.sh
```

Add to crontab (daily at 2 AM):

```bash
crontab -e
```

Add:

```
0 2 * * * /var/www/sgceducation/backup.sh
```

### 3. Log Rotation

PM2 handles log rotation automatically, but you can configure it:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4. Monitoring

Consider setting up monitoring tools:
- PM2 Plus (free tier available)
- Uptime monitoring (UptimeRobot, Pingdom)
- Application monitoring (New Relic, Datadog)

---

## Quick Deployment Checklist

- [ ] Server prepared (Node.js, MongoDB, Nginx installed)
- [ ] Application cloned/uploaded to server
- [ ] Dependencies installed (root, client, server)
- [ ] Frontend built (`npm run build` in client directory)
- [ ] Environment variables configured (`.env` in server)
- [ ] MongoDB secured with authentication
- [ ] Database users created
- [ ] PM2 configured and application started
- [ ] Nginx configured and enabled
- [ ] SSL certificate obtained and configured
- [ ] Firewall configured
- [ ] Domain DNS pointing to server IP
- [ ] Application accessible via domain
- [ ] Backups configured
- [ ] Monitoring set up

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs: `pm2 logs`
3. Check Nginx logs: `/var/log/nginx/`
4. Review MongoDB logs: `/var/log/mongodb/`

---

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Last Updated**: 2024
