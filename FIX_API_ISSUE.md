# Fix API Issues - Quick Steps

## Issue Identified

Your Nginx configuration has a few issues that can cause API requests to fail:

1. **Location block syntax**: Using `/api/` with trailing slash may not match all API paths correctly
2. **Health check pointing to wrong port**: Port 8080 should be 5000
3. **Socket.io location**: Not needed unless you're using WebSockets

## Quick Fix

### Step 1: Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/sgceducation
```

Replace the entire content with the corrected configuration (see `nginx-config-corrected.conf` file).

**Key changes:**
- Changed `location /api/` to `location /api` (no trailing slash)
- Removed socket.io location (not needed)
- Fixed health check to use port 5000
- Improved proxy headers

### Step 2: Test Configuration

```bash
sudo nginx -t
```

Should output: `syntax is ok` and `test is successful`

### Step 3: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 4: Test API

```bash
# Test from server
curl -k https://localhost/api/v1/health

# Should return JSON response like:
# {"success":true,"message":"API is healthy",...}
```

### Step 5: Check Logs

```bash
# Check for errors
sudo tail -f /var/log/nginx/sgceducation-error.log

# In another terminal, test an API call
curl -k https://boly.ddns.net/api/v1/health
```

## Verify Backend is Running

```bash
# Check PM2
pm2 status

# If not running:
cd /var/www/SGCEducation
pm2 start ecosystem.config.js

# View logs
pm2 logs sgc-education-api --lines 50
```

## Test Direct Backend Connection

```bash
# This should work from the server
curl http://localhost:5000/api/v1/health

# If this doesn't work, the backend has issues, not Nginx
```

## Common Problems and Solutions

### Problem: 502 Bad Gateway
**Cause**: Backend not running or not accessible
**Solution**: 
```bash
pm2 restart sgc-education-api
# Check if backend starts: pm2 logs sgc-education-api
```

### Problem: 404 Not Found
**Cause**: Route not matching correctly
**Solution**: Check Nginx location block matches `/api` (see corrected config)

### Problem: CORS errors in browser
**Cause**: Backend CORS not configured for your domain
**Solution**: Update `server/server.js`:
```javascript
app.use(cors({
  origin: 'https://boly.ddns.net',
  credentials: true
}));
```

### Problem: 504 Gateway Timeout
**Cause**: Backend too slow or timeouts too short
**Solution**: Increase proxy timeouts in Nginx config

## Updated Configuration (Key Parts)

```nginx
# Use /api without trailing slash
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Health check - fixed port
location /health {
    proxy_pass http://localhost:5000/api/v1/health;
    proxy_set_header Host $host;
}
```

## After Making Changes

1. Test config: `sudo nginx -t`
2. Reload Nginx: `sudo systemctl reload nginx`
3. Test API: `curl -k https://boly.ddns.net/api/v1/health`
4. Check browser console for errors
5. Verify PM2 is running: `pm2 status`
