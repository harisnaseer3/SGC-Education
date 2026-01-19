# SGC Education - Quick Deployment Guide

This is a condensed version of the full deployment guide. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- Ubuntu 20.04+ server
- Domain name pointing to server IP
- SSH access to server

## Quick Setup (30 minutes)

### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/nginx/sources.list.d/mongodb-org-6.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod

# Install Nginx and PM2
sudo apt install -y nginx
sudo npm install -g pm2
```

### 2. Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/sgceducation
sudo chown -R $USER:$USER /var/www/sgceducation
cd /var/www/sgceducation

# Clone/upload your application files here
# Then install dependencies
npm install
cd client && npm install && npm run build
cd ../server && npm install
```

### 3. Configure MongoDB

```bash
mongosh
```

In MongoDB shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "YOUR_SECURE_PASSWORD",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

use sgceducation
db.createUser({
  user: "sgcuser",
  pwd: "YOUR_DB_PASSWORD",
  roles: [ { role: "readWrite", db: "sgceducation" } ]
})
exit
```

Enable authentication:
```bash
sudo nano /etc/mongod.conf
# Add: security: authorization: enabled
sudo systemctl restart mongod
```

### 4. Configure Environment

```bash
# Backend .env
cd /var/www/sgceducation/server
nano .env
```

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://sgcuser:YOUR_DB_PASSWORD@localhost:27017/sgceducation?authSource=sgceducation
JWT_SECRET=YOUR_VERY_SECURE_JWT_SECRET_MIN_32_CHARS
```

```bash
# Frontend .env.production
cd /var/www/sgceducation/client
nano .env.production
```

```env
REACT_APP_API_URL=https://yourdomain.com/api/v1
```

### 5. Start with PM2

```bash
cd /var/www/sgceducation
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'sgc-education-api',
    script: './server/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 5000 },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    autorestart: true
  }]
};
```

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Run the command it outputs
```

### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/sgceducation
```

```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/sgceducation/client/build;
    index index.html;

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
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sgceducation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Setup SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Verify Deployment

1. Check PM2: `pm2 status`
2. Check Nginx: `sudo systemctl status nginx`
3. Check MongoDB: `sudo systemctl status mongod`
4. Visit: `https://yourdomain.com`

## Common Commands

```bash
# View logs
pm2 logs sgc-education-api

# Restart app
pm2 restart sgc-education-api

# Update application
cd /var/www/sgceducation
git pull  # if using git
cd client && npm install && npm run build
cd ../server && npm install
pm2 restart sgc-education-api
```

## Troubleshooting

- **App not loading**: Check `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`
- **API errors**: Verify `.env` file and MongoDB connection
- **SSL issues**: Check `sudo certbot certificates`

For detailed troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).
