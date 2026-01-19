# Fix Production API URL Issue

## Problem

Your frontend is still using `http://localhost:5000` instead of the production API URL (`https://boly.ddns.net/api/v1`).

## Solution

### Step 1: Update Environment Variable

On your server, edit the production environment file:

```bash
cd /var/www/SGCEducation/client
nano .env.production
```

Make sure it contains:

```env
REACT_APP_API_URL=https://boly.ddns.net/api/v1
```

**Important**: The URL must NOT have a trailing slash!

### Step 2: Rebuild Frontend

After updating `.env.production`, rebuild the frontend:

```bash
cd /var/www/SGCEducation/client
npm run build
```

This will create a new `build/` folder with the correct API URLs.

### Step 3: Restart Nginx (if needed)

```bash
sudo systemctl reload nginx
```

### Step 4: Clear Browser Cache

In your browser:
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) to hard refresh
- Or clear browser cache completely

## Verification

1. Open browser DevTools (F12) → Network tab
2. Try to login
3. Check the request URL - it should be `https://boly.ddns.net/api/v1/auth/login` NOT `http://localhost:5000/...`

## Why This Happened

React environment variables (starting with `REACT_APP_`) are embedded at **build time**, not runtime. This means:

- ✅ Setting `.env.production` **before** `npm run build` → Works
- ❌ Setting `.env.production` **after** `npm run build` → Doesn't work
- ❌ Just updating the file without rebuilding → Doesn't work

## Quick Fix Script

Run this on your server to fix everything at once:

```bash
#!/bin/bash
cd /var/www/SGCEducation/client

# Update .env.production
cat > .env.production << EOF
REACT_APP_API_URL=https://boly.ddns.net/api/v1
EOF

# Rebuild
npm run build

echo "✅ Frontend rebuilt with production API URL"
echo "📍 Test at: https://boly.ddns.net"
```

Save this as `fix-api-url.sh`, make it executable (`chmod +x fix-api-url.sh`), and run it.

## Still Having Issues?

### Check if .env.production exists and is correct:

```bash
cat /var/www/SGCEducation/client/.env.production
```

### Check the built files:

```bash
# Search for localhost in built files
grep -r "localhost:5000" /var/www/SGCEducation/client/build/static/js/*.js | head -5
```

If you see `localhost:5000` in the built files, the rebuild didn't pick up the environment variable.

### Verify environment variable is set:

```bash
cd /var/www/SGCEducation/client
cat .env.production
# Should show: REACT_APP_API_URL=https://boly.ddns.net/api/v1
```

### Manual check of built file:

```bash
# Check what API URL is actually in the built JavaScript
strings /var/www/SGCEducation/client/build/static/js/*.js | grep -i "api" | grep -i "boly\|localhost" | head -5
```

## Alternative: Quick Fix Without Rebuild

If you can't rebuild right now, you can use Nginx to rewrite API requests:

Add to your Nginx config before the `/api` location:

```nginx
# Temporary fix: Redirect localhost URLs to production API
location ~ ^/api/ {
    # This will catch any requests to /api/
    proxy_pass http://localhost:5000;
    # ... rest of proxy config
}
```

But the **proper fix** is to rebuild with the correct environment variable.
