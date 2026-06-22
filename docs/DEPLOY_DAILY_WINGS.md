# Deploy Daily Wings (First VPS Client)

Step-by-step deployment for **Daily Wings & Cafe** as the first client on VPS + PM2.

Repo: https://github.com/fielvioleta/fb-auto-poster

---

## Before You Start

You need:

| Item | Status |
|---|---|
| VPS account (DigitalOcean, Vultr, Linode, etc.) | |
| Ubuntu 22.04+ droplet | |
| SSH access to VPS | |
| GitHub repo cloned | ✅ already on GitHub |
| OpenAI API key | |
| Facebook Page ID + **Page token** | |
| Photos on Daily Wings Facebook Page | |

**Recommended VPS:** 1 GB RAM, ~$5–6/month (DigitalOcean Basic or Vulph/Vultr equivalent).

---

## Part 1 — Create the VPS

### DigitalOcean (example)

1. Go to [digitalocean.com](https://www.digitalocean.com) → **Create Droplet**
2. **Image:** Ubuntu 22.04 LTS
3. **Plan:** Basic → $6/mo (1 GB RAM, 1 vCPU)
4. **Region:** Singapore (closest to PH) or any available
5. **Authentication:** SSH key (recommended) or password
6. **Hostname:** `fb-autoposter`
7. Create droplet → note the **IP address** (e.g. `164.92.x.x`)

### Connect via SSH

From your PC (PowerShell or Git Bash):

```bash
ssh root@YOUR_VPS_IP
```

Or if you created a `deploy` user:

```bash
ssh deploy@YOUR_VPS_IP
```

---

## Part 2 — One-Time Server Setup

Run on the VPS:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install PM2
sudo npm install -g pm2

# Verify
node -v    # v20.x
npm -v
pm2 -v

# Create folders
sudo mkdir -p /opt/fb-auto-poster/clients
sudo chown -R $USER:$USER /opt/fb-auto-poster
cd /opt/fb-auto-poster
```

---

## Part 3 — Deploy Daily Wings

```bash
# Clone for Daily Wings client
git clone https://github.com/fielvioleta/fb-auto-poster.git clients/daily-wings
cd clients/daily-wings

# Install dependencies
npm install

# Create environment file
cp .env.example .env
nano .env
```

### Fill in `.env` for Daily Wings

```env
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
FACEBOOK_PAGE_ID=109195795325452
FACEBOOK_ACCESS_TOKEN=YOUR_PAGE_TOKEN_HERE
PORT=3001

POST_LANGUAGE=taglish
CRON_SCHEDULE=0 11 * * *
TIMEZONE=Asia/Manila
SCHEDULER_ENABLED=true
AUTO_PUBLISH=true

PAGE_PHOTOS_ENABLED=true
PAGE_PHOTOS_MAX=50

RESTAURANT_LAT=14.3294
RESTAURANT_LON=120.9366
WEATHER_ENABLED=true
HOLIDAY_ENABLED=true
HOLIDAY_COUNTRY_CODE=PH
LOG_LEVEL=info
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Verify restaurant profile

Already configured for Daily Wings in `src/config/restaurant.ts`. Edit if needed:

```bash
nano src/config/restaurant.ts
```

### Build

```bash
npm run build
```

---

## Part 4 — Test Before PM2

```bash
# Start temporarily
node dist/index.js
```

In another SSH session (or after backgrounding):

```bash
# Health check
curl http://localhost:3001/health

# Sync photos (first time — may take several minutes)
curl -X POST http://localhost:3001/photos/sync

# Test publish (posts to Facebook!)
curl -X POST http://localhost:3001/publish
```

Check Daily Wings Facebook Page — post should appear.

Stop the test server: `Ctrl+C`

---

## Part 5 — Start with PM2 (24/7)

```bash
cd /opt/fb-auto-poster/clients/daily-wings

pm2 start dist/index.js --name fb-autopost-daily-wings
pm2 save
pm2 startup
```

**Note on `pm2 startup`:** On modern PM2, it automatically runs `systemctl enable pm2-root` for you. If you see:

```
[PM2] [v] Command successfully executed.
```

you are done — **no extra `sudo env PATH=...` command needed.**

Verify:

```bash
pm2 list
pm2 logs fb-autopost-daily-wings --lines 30
curl http://localhost:3001/health
```

You should see:
- `fb-autopost-daily-wings` → **online**
- `HTTP server listening on port 3001`
- `Scheduler started: "0 11 * * *" (Asia/Manila)`
- `"facebookConnected": true` in health response

See [OPERATIONS.md](./OPERATIONS.md) for day-to-day commands.

---

## Part 6 — Confirm Scheduler

Server timezone vs app timezone:

```bash
date
TZ=Asia/Manila date
```

The app uses `TIMEZONE=Asia/Manila` in `.env` for the cron job — server TZ doesn't have to match, but good to know.

**Tomorrow at 11:00 AM Manila time**, a post should publish automatically. Check logs after:

```bash
pm2 logs fb-autopost-daily-wings
```

---

## Part 7 — Optional Hardening

### Firewall (SSH only)

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Port 3001 does not need to be public unless you want remote API access.

### Auto security updates

```bash
sudo apt install -y unattended-upgrades
```

---

## Quick Reference (Daily Wings)

| Item | Value |
|---|---|
| Folder | `/opt/fb-auto-poster/clients/daily-wings` |
| PM2 name | `fb-autopost-daily-wings` |
| Port | `3001` (internal) |
| Schedule | Daily 11:00 AM Asia/Manila |
| Logs | `logs/app-YYYY-MM-DD.log` |
| Post history | `data/posts.json` |

### Useful commands

```bash
pm2 restart fb-autopost-daily-wings
pm2 logs fb-autopost-daily-wings
pm2 stop fb-autopost-daily-wings
cd /opt/fb-auto-poster/clients/daily-wings && npm run build && pm2 restart fb-autopost-daily-wings
```

---

## After Daily Wings — Adding Client #2

See [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md) and run:

```bash
/opt/fb-auto-poster/repo/scripts/vps/new-client.sh cafe-xyz 3002
```

---

## Monthly Cost (Daily Wings only)

| Item | Cost |
|---|---|
| VPS (1 GB) | ~$5–6 USD |
| OpenAI | ~$0.05–0.20 USD |
| **Total** | **~$6 USD/month** |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Can't SSH | Check VPS IP, firewall, SSH key |
| `npm run build` fails | `node -v` must be 18+ |
| `facebookConnected: false` | Wrong token — use Page token from `me/accounts` |
| No post at 11 AM | `pm2 list` — process must be `online` |
| App crashed | `pm2 logs fb-autopost-daily-wings` |

---

## Deployment Complete Checklist

Use this to confirm Daily Wings is fully live:

```
[ ] pm2 list → fb-autopost-daily-wings is online
[ ] curl localhost:3001/health → facebookConnected: true
[ ] pm2 logs shows "Scheduler started"
[ ] pm2 save && pm2 startup completed
[ ] Test publish worked (post visible on Facebook Page)
[ ] Photos synced (optional): curl -X POST localhost:3001/photos/sync
```

---

## Next Step

Daily Wings should now post automatically every day at 11:00 AM Manila time.

For ongoing ops, see [OPERATIONS.md](./OPERATIONS.md).  
For adding client #2, see [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md).
