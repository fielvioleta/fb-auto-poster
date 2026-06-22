# VPS Multi-Client Hosting (Option A)

Long-term reference for hosting **one folder + one PM2 process per client** on a single VPS.

Use this when you sell the Facebook Auto-Poster to multiple restaurants. Each client is isolated — own config, own data, own logs, own Facebook Page token.

---

## Architecture

```
VPS (Ubuntu 22.04+)
└── /opt/fb-auto-poster/
    ├── repo/                          # optional: bare git clone for updates
    └── clients/
        ├── daily-wings/               # Client 1
        │   ├── .env
        │   ├── src/config/restaurant.ts
        │   ├── data/
        │   ├── logs/
        │   └── dist/
        ├── cafe-xyz/                  # Client 2
        └── milktea-abc/               # Client 3

PM2 processes:
  fb-autopost-daily-wings   → PORT 3001 (optional)
  fb-autopost-cafe-xyz      → PORT 3002 (optional)
  fb-autopost-milktea-abc   → PORT 3003 (optional)
```

**Rule:** One client slug = one folder = one PM2 name = one Facebook Page.

---

## Naming Convention

| Item | Format | Example |
|---|---|---|
| Client slug | lowercase, hyphens | `daily-wings` |
| Folder | `/opt/fb-auto-poster/clients/{slug}/` | `.../clients/daily-wings/` |
| PM2 process name | `fb-autopost-{slug}` | `fb-autopost-daily-wings` |
| Port (optional) | `3001`, `3002`, `3003…` | Daily Wings = `3001` |

Ports are only needed if you want HTTP API access per client. **Daily posting via cron does not require exposing ports.**

---

## One-Time VPS Setup

Run once on a fresh Ubuntu VPS (as root or with sudo).

### 1. Create system user (recommended)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 2. Install Node.js 20 + PM2 + Git

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
node -v   # should show v20.x
pm2 -v
```

### 3. Create folder structure

```bash
sudo mkdir -p /opt/fb-auto-poster/clients
sudo chown -R deploy:deploy /opt/fb-auto-poster
cd /opt/fb-auto-poster
```

### 4. Clone the repo (reference copy)

```bash
git clone https://github.com/fielvioleta/fb-auto-poster.git repo
```

You can also clone fresh per client (see New Client below).

### 5. PM2 startup on reboot

```bash
pm2 startup
# run the command it prints (sudo env PATH=...)
```

---

## New Client Setup (Copy-Paste)

Replace `CLIENT_SLUG` and `PORT` for each new customer.

```bash
# Variables — change these per client
CLIENT_SLUG="cafe-xyz"
PORT="3002"
REPO_URL="https://github.com/fielvioleta/fb-auto-poster.git"
BASE="/opt/fb-auto-poster/clients"

# 1. Clone app into client folder
mkdir -p "$BASE"
git clone "$REPO_URL" "$BASE/$CLIENT_SLUG"
cd "$BASE/$CLIENT_SLUG"

# 2. Install and build
npm install
cp .env.example .env
nano .env                    # fill OPENAI_API_KEY, FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN, PORT
nano src/config/restaurant.ts   # client name, menu, topics

npm run build

# 3. First-time photo sync (optional, can take a few minutes)
npm run start &              # or: node dist/index.js in background briefly
sleep 3
curl -X POST "http://localhost:$PORT/photos/sync"
# stop test server if you started manually

# 4. Test publish once
npm run publish

# 5. Start with PM2
pm2 start dist/index.js --name "fb-autopost-$CLIENT_SLUG"
pm2 save

# 6. Verify
pm2 list
pm2 logs "fb-autopost-$CLIENT_SLUG" --lines 50
```

Or use the helper script (on the VPS):

```bash
chmod +x /opt/fb-auto-poster/repo/scripts/vps/new-client.sh
/opt/fb-auto-poster/repo/scripts/vps/new-client.sh cafe-xyz 3002
```

---

## Per-Client `.env` Checklist

```env
OPENAI_API_KEY=sk-proj-...
FACEBOOK_PAGE_ID=...
FACEBOOK_ACCESS_TOKEN=...        # Page token from me/accounts
PORT=3001

POST_LANGUAGE=taglish
CRON_SCHEDULE=0 11 * * *
TIMEZONE=Asia/Manila
SCHEDULER_ENABLED=true
AUTO_PUBLISH=true

PAGE_PHOTOS_ENABLED=true
PAGE_PHOTOS_MAX=50

RESTAURANT_LAT=14.3294         # client location
RESTAURANT_LON=120.9366
```

---

## Daily Operations

### See all clients running

```bash
pm2 list
```

### Logs for one client

```bash
pm2 logs fb-autopost-daily-wings
tail -f /opt/fb-auto-poster/clients/daily-wings/logs/app-$(date +%Y-%m-%d).log
```

### Restart one client (after config change)

```bash
cd /opt/fb-auto-poster/clients/daily-wings
nano .env                        # or edit restaurant.ts
npm run build
pm2 restart fb-autopost-daily-wings
```

### Stop one client (churned customer)

```bash
pm2 stop fb-autopost-cafe-xyz
pm2 delete fb-autopost-cafe-xyz
# keep folder for records or archive it
```

### Update code for all clients (after you push to GitHub)

```bash
for dir in /opt/fb-auto-poster/clients/*/; do
  cd "$dir"
  git pull
  npm install
  npm run build
  pm2 restart "fb-autopost-$(basename "$dir")"
done
```

---

## Capacity Guide

| VPS size | Rough client capacity |
|---|---|
| 1 GB RAM / 1 vCPU | 3–8 clients |
| 2 GB RAM / 1 vCPU | 10–20 clients |
| 4 GB RAM / 2 vCPU | 30+ clients |

Each client is lightweight (one post per day). Photo sync is the heaviest job — run it once during onboarding, not daily.

---

## Security

- Never commit `.env` to GitHub.
- Use **Page tokens**, not user tokens.
- Prefer **system user tokens** for production clients.
- Restrict VPS SSH (key-only login, disable password auth).
- Optional: firewall — only open port 22 (SSH). API ports 3001+ can stay internal.

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| No post at 11 AM | `pm2 list` — is process online? `TZ=Asia/Manila date` on server |
| Facebook `#200` | Page token in that client's `.env` |
| Wrong caption language | That client's `POST_LANGUAGE` |
| Posted to wrong Page | Wrong `FACEBOOK_PAGE_ID` in that client's `.env` |
| Out of disk | `df -h` — logs rotate but check `logs/` per client |

---

## Related Docs

| Doc | Purpose |
|---|---|
| [DEPLOY_DAILY_WINGS.md](./DEPLOY_DAILY_WINGS.md) | First deployment — Daily Wings step by step |
| [CLIENT_ONBOARDING.md](./CLIENT_ONBOARDING.md) | Business checklist per new customer |
| [OVERVIEW.md](./OVERVIEW.md) | What the app does |
