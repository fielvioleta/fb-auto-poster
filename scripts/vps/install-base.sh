#!/usr/bin/env bash
# One-time VPS bootstrap for fb-auto-poster multi-client hosting.
# Run on Ubuntu 22.04+ as a user with sudo access.

set -euo pipefail

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> Installing PM2..."
sudo npm install -g pm2

echo "==> Creating directories..."
sudo mkdir -p /opt/fb-auto-poster/clients
sudo chown -R "$USER:$USER" /opt/fb-auto-poster

echo "==> Cloning reference repo..."
if [[ ! -d /opt/fb-auto-poster/repo ]]; then
  git clone https://github.com/fielvioleta/fb-auto-poster.git /opt/fb-auto-poster/repo
fi

echo ""
echo "==> Done. Versions:"
node -v
npm -v
pm2 -v
echo ""
echo "Next: follow docs/DEPLOY_DAILY_WINGS.md to deploy your first client."
echo "Or run: /opt/fb-auto-poster/repo/scripts/vps/new-client.sh CLIENT_SLUG PORT"
