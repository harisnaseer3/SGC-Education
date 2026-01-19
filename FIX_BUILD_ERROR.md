# Fix "react-scripts: not found" Build Error

## Problem

Getting error `sh: 1: react-scripts: not found` when running `npm run build` on the server.

## Cause

This means `node_modules` are not installed or not installed correctly in the `client/` directory.

## Solution

### Step 1: Check if node_modules exists

```bash
cd /var/www/SGCEducation/client
ls -la node_modules/.bin/react-scripts
```

If this file doesn't exist, dependencies aren't installed.

### Step 2: Install Dependencies

```bash
cd /var/www/SGCEducation/client

# Remove existing node_modules if corrupted
rm -rf node_modules package-lock.json

# Install dependencies
npm install
```

**Wait for installation to complete** - this can take 5-10 minutes.

### Step 3: Verify react-scripts is installed

```bash
ls -la node_modules/.bin/react-scripts
```

Should show the react-scripts executable.

### Step 4: Try building again

```bash
npm run build
```

## Alternative: Install using npm ci (for production)

If you have a `package-lock.json` file, use `npm ci` instead (cleaner for production):

```bash
cd /var/www/SGCEducation/client
npm ci
npm run build
```

## Troubleshooting

### Issue: npm install fails with errors

**Solution 1: Clear npm cache**
```bash
npm cache clean --force
npm install
```

**Solution 2: Use different Node.js version**
```bash
# Check Node version
node --version

# Should be Node 18.x or 20.x for React 19
# If using wrong version, install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Issue: Out of memory during build

**Solution: Increase Node memory limit**
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

Or modify `package.json` build script:
```json
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=2048' react-scripts build"
}
```

### Issue: Permission errors

**Solution: Fix ownership**
```bash
# Make sure you own the directory
sudo chown -R $USER:$USER /var/www/SGCEducation/client
npm install
```

### Issue: react-scripts not in PATH

**Solution: Use npx or full path**
```bash
# Using npx
npx react-scripts build

# Or use full path
./node_modules/.bin/react-scripts build
```

## Quick Fix Script

Run this complete fix script:

```bash
#!/bin/bash
cd /var/www/SGCEducation/client

echo "Cleaning old installations..."
rm -rf node_modules package-lock.json

echo "Installing dependencies..."
npm install

echo "Verifying react-scripts..."
if [ -f "node_modules/.bin/react-scripts" ]; then
    echo "✅ react-scripts found"
else
    echo "❌ react-scripts still not found"
    exit 1
fi

echo "Building production bundle..."
npm run build

echo "✅ Build complete!"
```

Save as `fix-build.sh`, make executable (`chmod +x fix-build.sh`), and run it.

## Verify Installation

After `npm install`, check:

```bash
# Check react-scripts exists
ls node_modules/.bin/react-scripts

# Check version
./node_modules/.bin/react-scripts --version

# Or
npx react-scripts --version
```

## Common Causes

1. **Dependencies not installed** - Most common, run `npm install`
2. **Wrong directory** - Make sure you're in `/var/www/SGCEducation/client`
3. **Corrupted node_modules** - Remove and reinstall
4. **Wrong Node.js version** - Need Node 18+ for React 19
5. **Out of memory** - Server doesn't have enough RAM

## Check System Requirements

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check available memory
free -h

# Check disk space
df -h
```

Your server should have:
- Node.js 18.x or 20.x
- npm 9.x or 10.x
- At least 1GB RAM free
- At least 1GB disk space
