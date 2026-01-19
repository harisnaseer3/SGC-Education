#!/bin/bash

# SGC Education Deployment Script
# This script helps automate the deployment process
# Run with: bash deploy.sh

set -e  # Exit on error

echo "🚀 SGC Education Deployment Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. Use a regular user with sudo privileges.${NC}"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check MongoDB
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${YELLOW}Warning: MongoDB client not found. Make sure MongoDB is installed.${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Get current directory
APP_DIR=$(pwd)
echo "Application directory: $APP_DIR"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "  - Root dependencies..."
npm install

echo "  - Client dependencies..."
cd client
npm install

echo "  - Server dependencies..."
cd ../server
npm install

cd "$APP_DIR"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build frontend
echo "🏗️  Building frontend..."
cd client
if npm run build; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

cd "$APP_DIR"
echo ""

# Check for .env files
echo "🔍 Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}Warning: server/.env not found${NC}"
    if [ -f "server/env.example" ]; then
        echo "  Creating server/.env from env.example..."
        cp server/env.example server/.env
        echo -e "${YELLOW}  Please edit server/.env with your production values${NC}"
    fi
else
    echo -e "${GREEN}✓ server/.env exists${NC}"
fi

if [ ! -f "client/.env.production" ]; then
    echo -e "${YELLOW}Warning: client/.env.production not found${NC}"
    echo "  Creating client/.env.production..."
    cat > client/.env.production << EOF
REACT_APP_API_URL=https://yourdomain.com/api/v1
EOF
    echo -e "${YELLOW}  Please edit client/.env.production with your domain${NC}"
else
    echo -e "${GREEN}✓ client/.env.production exists${NC}"
fi

echo ""

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 is installed${NC}"
fi

echo ""

# Create ecosystem.config.js if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    echo "📝 Creating ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sgc-education-api',
    script: './server/server.js',
    instances: 2,
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
EOF
    echo -e "${GREEN}✓ ecosystem.config.js created${NC}"
else
    echo -e "${GREEN}✓ ecosystem.config.js exists${NC}"
fi

# Create logs directory
mkdir -p logs

echo ""
echo "=================================="
echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your production values"
echo "2. Edit client/.env.production with your domain"
echo "3. Configure MongoDB (see DEPLOYMENT.md)"
echo "4. Configure Nginx (see DEPLOYMENT.md)"
echo "5. Run: pm2 start ecosystem.config.js"
echo "6. Run: pm2 save"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
