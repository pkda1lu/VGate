#!/bin/bash

# VGate - VLESS Reality Panel Installer
# Target: Ubuntu/Debian

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root.${NC}"
   exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   VGATE VLESS REALITY PANEL INSTALLER   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Update & Install Dependencies
echo -e "${GREEN}[1/5]${NC} Installing system dependencies..."
apt update && apt install -y curl unzip git wget socat libcap2-bin build-essential jq

# 2. Install Node.js LTS
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}[2/5]${NC} Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}[2/5]${NC} Node.js already installed: $(node -v)"
fi

# 3. Install Xray-core
if ! command -v xray &> /dev/null; then
    echo -e "${GREEN}[3/5]${NC} Installing Xray-core..."
    bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
else
    echo -e "${GREEN}[3/5]${NC} Xray-core already installed: $(xray -version | head -n 1)"
fi

# 4. Setup VGate Environment
echo -e "${GREEN}[4/5]${NC} Setting up VGate files and building..."
INSTALL_DIR="/etc/vgate"
mkdir -p "$INSTALL_DIR"

# Copy files (if running from source dir)
if [ -d "server" ] && [ -d "client" ]; then
    cp -r . "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Build Server
echo -e "${BLUE}Building Backend...${NC}"
cd server
npm install
npm run build
# Important: ensure DB schema is synced
npx drizzle-kit push
cd ..

# Build Frontend
echo -e "${BLUE}Building Management Dashboard...${NC}"
cd client
npm install
npm run build
cd ..

# Sync static files
mkdir -p server/public
rm -rf server/public/*
cp -r client/dist/* server/public/

# Make scripts executable
chmod +x update.sh

# 5. Service Configuration
echo -e "${GREEN}[5/5]${NC} Configuring systemd service..."

cat <<EOF > /etc/systemd/system/vgate.service
[Unit]
Description=VGate VLESS Reality Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/server
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
systemctl restart vgate

# Final Info
PUBLIC_IP=$(curl -s ifconfig.me)
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN} SUCCESS: VGate Panel is now online!       ${NC}"
echo -e " URL: ${BLUE}http://$PUBLIC_IP:4000${NC}"
echo -e " Directory: ${BLUE}$INSTALL_DIR${NC}"
echo -e " Update via: ${YELLOW}bash $INSTALL_DIR/update.sh${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW} Note: Log in to the dashboard to configure Xray settings.${NC}"
