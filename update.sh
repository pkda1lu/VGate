#!/bin/bash

# VGate Update Script 
# Author: Antigravity
# Usage: sudo bash update.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}        UPDATING VGATE CLUSTER         ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Navigate to VGate directory (default for production)
PROJECT_DIR="/etc/vgate"
if [ ! -d "$PROJECT_DIR" ]; then PROJECT_DIR=$(pwd); fi
cd "$PROJECT_DIR"

echo -e "${GREEN}[1/5]${NC} Git Pulling latest changes..."
if [ -d .git ]; then
    git pull || echo -e "${RED}Warning: Pull failed, continuing anyway...${NC}"
else
    echo -e "Not a GIT repository, skipping pull."
fi

echo -e "${GREEN}[2/5]${NC} Pre-migration check (SQlite3)..."
# Safely add columns if missing for existing installations
sqlite3 server/data.db "ALTER TABLE inbounds ADD COLUMN node_id INTEGER DEFAULT 1;" 2>/dev/null || true
sqlite3 server/data.db "ALTER TABLE inbounds ADD COLUMN is_global BOOLEAN DEFAULT 0;" 2>/dev/null || true
sqlite3 server/data.db "ALTER TABLE clients ADD COLUMN sub_id TEXT;" 2>/dev/null || true
sqlite3 server/data.db "UPDATE clients SET sub_id = uuid WHERE sub_id IS NULL OR sub_id = '';" 2>/dev/null || true
sqlite3 server/data.db "CREATE TABLE IF NOT EXISTS nodes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL, api_key TEXT NOT NULL, status TEXT DEFAULT 'offline', last_seen INTEGER, is_master BOOLEAN DEFAULT 0, created_at INTEGER);" 2>/dev/null || true
sqlite3 server/data.db "INSERT OR IGNORE INTO nodes (id, name, address, api_key, status, is_master) VALUES (1, 'Master Panel', 'localhost', 'master-key', 'online', 1);" 2>/dev/null || true

echo -e "${GREEN}[3/5]${NC} Server: Dependencies & Build..."
cd server
npm install
# Rebuild better-sqlite3 for current architecture to prevent startup errors
npm rebuild better-sqlite3 --build-from-source
npm run build
cd ..

echo -e "${GREEN}[4/5]${NC} Client: Dependencies & Build..."
cd client
npm install
npm run build
cd ..

# Deployment Step
echo -e "Syncing static assets..."
mkdir -p server/public
rm -rf server/public/*
cp -r client/dist/* server/public/

echo -e "${GREEN}[5/5]${NC} Finalizing: Restarting Service..."
systemctl restart vgate && sleep 2
systemctl status vgate --no-pager | head -n 15

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}SUCCESS: VGate Cluster updated!${NC}"
echo -e "${BLUE}=======================================${NC}"

