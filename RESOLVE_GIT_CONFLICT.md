# Resolve Git Pull Conflict

## Problem
Git is trying to overwrite your local `.env.production` file during pull.

## Solution

### Option 1: Backup and Restore (Recommended)

```bash
cd /var/www/SGCEducation

# 1. Backup your current .env.production
cp client/.env.production client/.env.production.backup

# 2. Check what's in your current file (important!)
cat client/.env.production

# 3. Remove the file temporarily
rm client/.env.production

# 4. Pull the changes
git pull

# 5. Restore your production environment file
cp client/.env.production.backup client/.env.production

# 6. Verify it has the correct production URL
cat client/.env.production
# Should show: REACT_APP_API_URL=https://boly.ddns.net/api/v1

# 7. Clean up backup (optional)
rm client/.env.production.backup
```

### Option 2: Stash and Restore

```bash
cd /var/www/SGCEducation

# 1. Stash your local changes (if any)
git stash

# 2. Remove .env.production
rm client/.env.production

# 3. Pull changes
git pull

# 4. Create .env.production with production values
cat > client/.env.production << EOF
REACT_APP_API_URL=https://boly.ddns.net/api/v1
EOF

# 5. Verify
cat client/.env.production
```

### Option 3: Force Overwrite (Only if you don't need local changes)

```bash
cd /var/www/SGCEducation

# Remove the file
rm client/.env.production

# Pull
git pull

# Recreate with production values
echo "REACT_APP_API_URL=https://boly.ddns.net/api/v1" > client/.env.production
```

## After Resolving

Once you've pulled successfully:

1. **Rebuild the frontend** (since we updated API URLs):
   ```bash
   cd /var/www/SGCEducation/client
   npm install  # In case new dependencies were added
   npm run build
   ```

2. **Restart the backend** (if needed):
   ```bash
   cd /var/www/SGCEducation
   pm2 restart sgc-education-api
   ```

3. **Reload Nginx**:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Important Notes

- **Never commit `.env.production`** - It should be in `.gitignore`
- **Always keep a backup** of your production environment variables
- **Verify the API URL** after pulling to ensure it's still set correctly
