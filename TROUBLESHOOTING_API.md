# API Not Working - Troubleshooting Guide

## Common Issues and Solutions

### 1. Check if Backend is Running

```bash
# Check PM2 status
pm2 status

# Check if process is running
pm2 list

# View backend logs
pm2 logs sgc-education-api --lines 100

# Check if port 5000 is listening
sudo netstat -tulpn | grep 5000
# or
sudo ss -tulpn | grep 5000
```

**Solution if not running:**
```bash
cd /var/www/SGCEducation
pm2 start ecosystem.config.js
pm2 save
```

---

### 2. Test Backend Directly

```bash
# Test from server itself
curl http://localhost:5000/api/v1/health

# Should return: {"success":true,"message":"API is healthy",...}

# Test authentication endpoint
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**If this fails:**
- Backend is not running or not configured correctly
- Check `.env` file in `server/` directory
- Check MongoDB connection

---

### 3. Test Through Nginx

```bash
# Test API endpoint through Nginx (from server)
curl -k https://localhost/api/v1/health

# Test from external (if you have curl installed)
curl -k https://boly.ddns.net/api/v1/health
```

**If this fails but direct backend works:**
- Nginx proxy configuration issue
- Check Nginx error logs: `sudo tail -f /var/log/nginx/sgceducation-error.log`

---

### 4. Check Nginx Configuration

```bash
# Test Nginx config syntax
sudo nginx -t

# Reload Nginx if config is valid
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

---

### 5. Check Nginx Logs

```bash
# Real-time error log monitoring
sudo tail -f /var/log/nginx/sgceducation-error.log

# Real-time access log monitoring
sudo tail -f /var/log/nginx/sgceducation-access.log

# Check for API requests in access log
sudo grep "/api" /var/log/nginx/sgceducation-access.log | tail -20
```

**Common log errors:**
- `502 Bad Gateway` - Backend not running or not accessible
- `504 Gateway Timeout` - Backend too slow, increase proxy timeouts
- `connection refused` - Backend not listening on port 5000

---

### 6. Verify Environment Variables

```bash
# Check backend .env file
cat /var/www/SGCEducation/server/.env

# Verify MongoDB connection string
# Should be: mongodb://user:password@localhost:27017/sgceducation?authSource=sgceducation

# Check if MongoDB is running
sudo systemctl status mongod
```

---

### 7. Check CORS Configuration

In `server/server.js`, CORS should allow your domain:

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://boly.ddns.net',
  credentials: true
}));
```

Or for development:
```javascript
app.use(cors({
  origin: ['https://boly.ddns.net', 'http://localhost:3000'],
  credentials: true
}));
```

---

### 8. Check Browser Console

Open browser DevTools (F12) → Network tab:
- Look for failed API requests
- Check status codes (401, 403, 404, 500, 502, 504)
- Check request URLs - should be `https://boly.ddns.net/api/v1/...`
- Check response headers

**Common issues:**
- **CORS errors**: Backend CORS not configured for your domain
- **401 Unauthorized**: Token expired or invalid
- **404 Not Found**: Route not matching (check proxy_pass configuration)
- **502 Bad Gateway**: Backend not running
- **504 Gateway Timeout**: Backend too slow

---

### 9. Verify API URL in Frontend

Check your frontend `.env.production`:
```bash
cat /var/www/SGCEducation/client/.env.production
```

Should contain:
```
REACT_APP_API_URL=https://boly.ddns.net/api/v1
```

**If using hardcoded URLs**, they should use this environment variable.

---

### 10. Common Configuration Fixes

#### Fix 1: Correct proxy_pass syntax

**Wrong:**
```nginx
location /api/ {
    proxy_pass http://localhost:5000;
}
```

**Correct (Option A - preserves path):**
```nginx
location /api {
    proxy_pass http://localhost:5000;
}
```

**Correct (Option B - with trailing slash):**
```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;
}
```

#### Fix 2: Increase timeouts

Add to your location block:
```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

#### Fix 3: Ensure backend is accessible

```bash
# From server, test if backend responds
curl -v http://localhost:5000/api/v1/health

# Check firewall (should allow localhost)
sudo ufw status
```

---

## Step-by-Step Debugging Process

1. **Check Backend Status**
   ```bash
   pm2 status
   pm2 logs sgc-education-api --lines 50
   ```

2. **Test Backend Directly**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

3. **Test Through Nginx**
   ```bash
   curl -k https://localhost/api/v1/health
   ```

4. **Check Nginx Logs**
   ```bash
   sudo tail -50 /var/log/nginx/sgceducation-error.log
   ```

5. **Verify Configuration**
   ```bash
   sudo nginx -t
   ```

6. **Check Browser Network Tab**
   - Open DevTools → Network
   - Try making an API request
   - Check status code and response

---

## Quick Fix Checklist

- [ ] Backend is running (`pm2 status`)
- [ ] Backend responds to `curl http://localhost:5000/api/v1/health`
- [ ] Nginx config is valid (`sudo nginx -t`)
- [ ] Nginx is running (`sudo systemctl status nginx`)
- [ ] MongoDB is running (`sudo systemctl status mongod`)
- [ ] `.env` file exists and is configured
- [ ] `.env.production` has correct API URL
- [ ] Frontend was rebuilt after changing `.env.production`
- [ ] No CORS errors in browser console
- [ ] Firewall allows port 5000 (or backend is localhost-only)

---

## Still Not Working?

1. **Enable debug logging in Nginx:**
   ```nginx
   error_log /var/log/nginx/sgceducation-error.log debug;
   ```

2. **Enable verbose logging in backend:**
   - Check `server.js` has request logging
   - Check PM2 logs: `pm2 logs sgc-education-api`

3. **Test with simple curl command:**
   ```bash
   curl -X GET "https://boly.ddns.net/api/v1/health" \
     -H "Content-Type: application/json" \
     -v
   ```

4. **Check all processes:**
   ```bash
   ps aux | grep node
   ps aux | grep nginx
   ps aux | grep mongod
   ```

---

## Contact Points for Debugging

- Backend logs: `pm2 logs sgc-education-api`
- Nginx error log: `/var/log/nginx/sgceducation-error.log`
- Nginx access log: `/var/log/nginx/sgceducation-access.log`
- MongoDB log: `/var/log/mongodb/mongod.log`
