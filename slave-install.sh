#!/bin/bash

# VGate Slave Node Installer
# Usage: sudo bash slave-install.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: Run as root!${NC}"
   exit 1
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    VGATE SLAVE NODE INSTALLER         ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Input variables
read -p "Enter Master Panel URL (e.g., https://panel.example.com): " MASTER_URL
read -p "Enter Node API Key: " NODE_API_KEY

if [ -z "$MASTER_URL" ] || [ -z "$NODE_API_KEY" ]; then
    echo -e "${RED}Error: Master URL and API Key are required!${NC}"
    exit 1
fi

# Remove trailing slash from URL
MASTER_URL=${MASTER_URL%/}

echo -e "${GREEN}[1/4]${NC} Installing dependencies..."
apt update && apt install -y curl unzip git build-essential

# Node.js
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt install -y nodejs
fi

# Xray
if ! command -v xray &> /dev/null; then
    bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
fi

echo -e "${GREEN}[2/4]${NC} Downloading VGate Slave Service..."
mkdir -p /etc/vgate
cd /etc/vgate

# Clone or download the gate software
# Since it's a private repo usually, we'd need a token or we can use the main zip
# For now, we assume we want to pull the same code as the panel
git clone https://github.com/anotroot/VGate.git . || echo "Using existing files..."

echo -e "${GREEN}[3/4]${NC} Building Service..."
cd server
npm install
npm rebuild better-sqlite3 --build-from-source
npm run build

echo -e "${GREEN}[4/4]${NC} Configuring systemd..."

cat <<EOF > /etc/systemd/system/vgate-slave.service
[Unit]
Description=VGate Slave Node Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/etc/vgate/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=MASTER_URL=$MASTER_URL
Environment=NODE_API_KEY=$NODE_API_KEY
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vgate-slave
systemctl restart vgate-slave

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN} SUCCESS: Slave Node is connected!         ${NC}"
echo -e " Check Master Panel dashboard to confirm.  "
echo -e "${BLUE}========================================${NC}"
