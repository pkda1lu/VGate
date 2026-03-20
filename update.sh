#!/bin/bash

# VGate Update Script
# Usage: bash update.sh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}        UPDATING VGATE PANEL           ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Navigate to VGate directory
cd /etc/vgate

echo -e "${GREEN}[1/4]${NC} Pulling latest changes..."
# If it's a git repo
if [ -d .git ]; then
    git pull
else
    echo -e "Skipping git pull (not a git repository)"
fi

echo -e "${GREEN}[2/4]${NC} Building Server..."
cd server
npm install
npm run build
# Sync DB schema
echo -e "Updating Database Schema..."
npx drizzle-kit push
cd ..

echo -e "${GREEN}[3/4]${NC} Building Frontend..."
cd client
npm install
npm run build
cd ..

# Copy build to server public
echo -e "Moving frontend to server..."
mkdir -p server/public
rm -rf server/public/*
cp -r client/dist/* server/public/

echo -e "${GREEN}[4/4]${NC} Restarting Service..."
systemctl restart vgate

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}SUCCESS: VGate updated to latest version!${NC}"
echo -e "${BLUE}=======================================${NC}"
