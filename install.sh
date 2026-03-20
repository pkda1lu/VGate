#!/bin/bash

# VGate - VLESS Reality Panel Installer
# Target: Ubuntu/Debian/CentOS

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   VGATE VLESS REALITY PANEL INSTALLER   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Update & Install Basic Deps
echo -e "${GREEN}[1/5]${NC} Installing system dependencies..."
apt update && apt install -y curl unzip git wget socat libcap2-bin build-essential

# 2. Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}[2/5]${NC} Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}[2/5]${NC} Node.js already installed."
fi

# 3. Install Xray-core
echo -e "${GREEN}[3/5]${NC} Installing Xray-core..."
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# 4. Setup VGate Directory
echo -e "${GREEN}[4/5]${NC} Setting up VGate files and building..."
mkdir -p /etc/vgate
cp -r . /etc/vgate/
cd /etc/vgate

echo -e "Building Server Backend..."
cd server && npm install && npm run build
echo -e "Syncing Database Schema..."
npx drizzle-kit push
cd ..

echo -e "Building Management Dashboard..."
cd client && npm install && npm run build && cd ..

# Move dashboard build to server for static serving
mkdir -p server/public
cp -r client/dist/* server/public/

# 5. Create Systemd Service
echo -e "${GREEN}[5/5]${NC} Creating systemd service..."

cat <<EOF > /etc/systemd/system/vgate.service
[Unit]
Description=VGate VLESS Reality Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/vgate/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=PORT=4000
Environment=DATABASE_URL="file:./data.db"
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vgate
systemctl start vgate

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}SUCCESS: VGate installed!${NC}"
echo -e "Access panel at: ${BLUE}http://$(curl -s ifconfig.me):4000${NC}"
echo -e "${BLUE}=======================================${NC}"
