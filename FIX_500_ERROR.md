# Fix 500 Internal Server Error

## Quick Diagnosis Steps

### Step 1: Check Nginx Error Logs

```bash
# View recent error logs
sudo tail -50 /var/log/nginx/sgceducation-error.log

# Or check general error log
sudo tail -50 /var/log/nginx/error.log
```

**This will tell you exactly what's wrong!**

### Step 2: Check Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t
```

If there are syntax errors, fix them first.

### Step 3: Check if React Build Exists

```bash
# Check if build directory exists
ls -la /var/www/SGCEducation/client/build/

# Check if index.html exists
ls -la /var/www/SGCEducation/client/build/index.html
```

### Step 4: Check Backend Status

```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs sgc-education-api --lines 50
```

### Step 5: Check Permissions

```bash
# Check directory permissions
ls -la /var/www/SGCEducation/client/build/

# Fix if needed (replace 'youruser' with actual user)
sudo chown -R $USER:$USER /var/www/SGCEducation/client/build
```

---

## Common Causes and Solutions

### Issue 1: React Build Directory Missing or Incomplete

**Symptoms**: Error log shows "file not found" or "directory index of... is forbidden"

**Solution**:
```bash
cd /var/www/SGCEducation/client

# Make sure .env.production exists
cat .env.production
# Should show: REACT_APP_API_URL=https://boly.ddns.net/api/v1

# Build the frontend
npm run build

# Verify build was created
ls -la build/index.html
```

### Issue 2: Wrong Root Path in Nginx

**Symptoms**: Error log shows "root directory does not exist"

**Solution**: Check your Nginx config matches actual path:

```bash
# Check actual path
ls -la /var/www/SGCEducation/client/build/

# If path is different, update Nginx config
sudo nano /etc/nginx/sites-available/sgceducation
# Update the root line to match actual path
```

### Issue 3: Permission Denied

**Symptoms**: Error log shows "permission denied" or "403 Forbidden"

**Solution**:
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/SGCEducation/client/build

# Or if using different user
sudo chown -R $USER:$USER /var/www/SGCEducation/client/build
sudo chmod -R 755 /var/www/SGCEducation/client/build
```

### Issue 4: Backend Not Running

**Symptoms**: API calls failing, 502 errors in logs

**Solution**:
```bash
# Start backend
cd /var/www/SGCEducation
pm2 start ecosystem.config.js

# Or restart if already running
pm2 restart sgc-education-api

# Check status
pm2 status
```

### Issue 5: SELinux or AppArmor Blocking (if enabled)

**Symptoms**: Permission errors despite correct ownership

**Solution**:
```bash
# Check if SELinux is enabled
sestatus

# If enabled, allow Nginx access (CentOS/RHEL)
sudo setsebool -P httpd_read_user_content 1

# Check AppArmor status (Ubuntu)
sudo aa-status

# If issues, disable or configure AppArmor for Nginx
```

---

## Complete Troubleshooting Script

Run this to diagnose everything at once:

```bash
#!/bin/bash

echo "=== Diagnosing 500 Error ==="
echo ""

echo "1. Checking Nginx configuration..."
sudo nginx -t
echo ""

echo "2. Checking React build directory..."
if [ -f "/var/www/SGCEducation/client/build/index.html" ]; then
    echo "✅ Build directory exists"
    ls -lh /var/www/SGCEducation/client/build/index.html
else
    echo "❌ Build directory missing or incomplete"
    echo "   Run: cd /var/www/SGCEducation/client && npm run build"
fi
echo ""

echo "3. Checking backend status..."
pm2 status
echo ""

echo "4. Checking directory permissions..."
ls -ld /var/www/SGCEducation/client/build/
echo ""

echo "5. Recent Nginx errors:"
sudo tail -20 /var/log/nginx/sgceducation-error.log
echo ""

echo "6. Testing backend directly..."
curl -s http://localhost:5000/api/v1/health || echo "❌ Backend not responding"
echo ""
```

---

## Step-by-Step Fix

### 1. View Error Logs (Most Important!)

```bash
sudo tail -50 /var/log/nginx/sgceducation-error.log
```

**This will show you the exact error!** Common errors you might see:

- `No such file or directory` → Build directory missing
- `Permission denied` → Fix permissions
- `Primary script unknown` → Wrong root path
- `Connection refused` → Backend not running

### 2. Verify Nginx Config Points to Correct Path

```bash
# Check what Nginx root is set to
grep "root" /etc/nginx/sites-available/sgceducation

# Check if that path exists
ls -la /var/www/SGCEducation/client/build/
```

### 3. Ensure React Build Exists

```bash
cd /var/www/SGCEducation/client

# Check if .env.production is set
cat .env.production

# Build if not built yet
npm run build

# Verify
ls -la build/index.html
```

### 4. Fix Permissions

```bash
# Option A: Use www-data (Nginx user)
sudo chown -R www-data:www-data /var/www/SGCEducation/client/build
sudo chmod -R 755 /var/www/SGCEducation/client/build

# Option B: Use your user (if Nginx runs as your user)
sudo chown -R $USER:$USER /var/www/SGCEducation/client/build
sudo chmod -R 755 /var/www/SGCEducation/client/build
```

### 5. Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Test Again

```bash
# Test from server
curl -I https://boly.ddns.net

# Should return 200 OK, not 500
```

---

## Most Common Fix

**90% of the time**, the issue is that the React build doesn't exist or is incomplete:

```bash
cd /var/www/SGCEducation/client

# Make sure .env.production exists
echo "REACT_APP_API_URL=https://boly.ddns.net/api/v1" > .env.production

# Install dependencies if needed
npm install

# Build
npm run build

# Fix permissions
sudo chown -R www-data:www-data build/
sudo chmod -R 755 build/

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## Still Not Working?

1. **Check full error log**: `sudo cat /var/log/nginx/sgceducation-error.log | tail -100`
2. **Check Nginx access log**: `sudo tail -20 /var/log/nginx/sgceducation-access.log`
3. **Check if port 443 is listening**: `sudo netstat -tulpn | grep 443`
4. **Check Nginx status**: `sudo systemctl status nginx`
5. **Restart Nginx completely**: `sudo systemctl restart nginx`

---

## Quick Diagnostic Commands

```bash
# One-liner to see all relevant info
echo "=== Build exists? ===" && \
ls -lh /var/www/SGCEducation/client/build/index.html 2>/dev/null && \
echo "=== Nginx config OK? ===" && \
sudo nginx -t && \
echo "=== Backend running? ===" && \
pm2 list | grep sgc-education-api && \
echo "=== Recent errors ===" && \
sudo tail -5 /var/log/nginx/sgceducation-error.log
```
