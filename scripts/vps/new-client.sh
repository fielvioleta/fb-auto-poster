#!/usr/bin/env bash
# Create a new fb-auto-poster client on the VPS.
# Usage: ./new-client.sh CLIENT_SLUG [PORT]
# Example: ./new-client.sh cafe-xyz 3002

set -euo pipefail

CLIENT_SLUG="${1:-}"
PORT="${2:-3002}"
REPO_URL="${REPO_URL:-https://github.com/fielvioleta/fb-auto-poster.git}"
BASE="${BASE:-/opt/fb-auto-poster/clients}"

if [[ -z "$CLIENT_SLUG" ]]; then
  echo "Usage: $0 CLIENT_SLUG [PORT]"
  echo "Example: $0 cafe-xyz 3002"
  exit 1
fi

if [[ -d "$BASE/$CLIENT_SLUG" ]]; then
  echo "Error: $BASE/$CLIENT_SLUG already exists."
  exit 1
fi

echo "==> Creating client: $CLIENT_SLUG (port $PORT)"

mkdir -p "$BASE"
git clone "$REPO_URL" "$BASE/$CLIENT_SLUG"
cd "$BASE/$CLIENT_SLUG"

npm install
cp .env.example .env

# Set port in .env
if grep -q '^PORT=' .env; then
  sed -i "s/^PORT=.*/PORT=$PORT/" .env
else
  echo "PORT=$PORT" >> .env
fi

echo ""
echo "==> Next steps (manual):"
echo "  1. Edit .env:           nano $BASE/$CLIENT_SLUG/.env"
echo "  2. Edit restaurant:     nano $BASE/$CLIENT_SLUG/src/config/restaurant.ts"
echo "  3. Build:               cd $BASE/$CLIENT_SLUG && npm run build"
echo "  4. Test publish:        cd $BASE/$CLIENT_SLUG && npm run publish"
echo "  5. Start PM2:           pm2 start dist/index.js --name fb-autopost-$CLIENT_SLUG"
echo "  6. Save PM2:            pm2 save"
echo ""
