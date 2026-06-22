# Operations Guide

Day-to-day reference for running the Facebook Auto-Poster on a VPS with PM2.

---

## Daily Wings (Current Production)

| Item | Value |
|---|---|
| VPS path | `/opt/fb-auto-poster/clients/daily-wings` |
| PM2 name | `fb-autopost-daily-wings` |
| Port | `3001` |
| Schedule | Daily 11:00 AM `Asia/Manila` |
| Post history | `data/posts.json` |
| Photo cache | `data/pagePhotos.json` |
| Logs | `logs/app-YYYY-MM-DD.log` |

---

## Check If Everything Is Running

```bash
pm2 list
```

Expected: `fb-autopost-daily-wings` → **online**

```bash
curl http://localhost:3001/health
```

Expected:
```json
{
  "status": "ok",
  "facebookConnected": true,
  ...
}
```

```bash
pm2 logs fb-autopost-daily-wings --lines 20
```

Expected lines:
- `HTTP server listening on port 3001`
- `Scheduler started: "0 11 * * *" (Asia/Manila)`

---

## PM2 Commands

| Task | Command |
|---|---|
| View status | `pm2 list` |
| View logs (live) | `pm2 logs fb-autopost-daily-wings` |
| View last 50 lines | `pm2 logs fb-autopost-daily-wings --lines 50` |
| Restart app | `pm2 restart fb-autopost-daily-wings` |
| Stop app | `pm2 stop fb-autopost-daily-wings` |
| Start app | `pm2 start fb-autopost-daily-wings` |
| Save process list | `pm2 save` |

### PM2 startup on reboot

You already ran:

```bash
pm2 save
pm2 startup
```

On **modern PM2**, `pm2 startup` automatically runs `systemctl enable pm2-root`. You do **not** need a separate `sudo env PATH=...` command if you see:

```
[PM2] [v] Command successfully executed.
```

### Test reboot recovery (optional)

```bash
reboot
# wait 1 min, SSH back in
pm2 list   # should still show online
```

---

## After Changing Config

### Changed `.env`

```bash
cd /opt/fb-auto-poster/clients/daily-wings
nano .env
npm run build
pm2 restart fb-autopost-daily-wings
```

### Changed `restaurant.ts` (menu, topics, name)

```bash
cd /opt/fb-auto-poster/clients/daily-wings
nano src/config/restaurant.ts
npm run build
pm2 restart fb-autopost-daily-wings
```

### Changed language

Edit `.env`:
```env
POST_LANGUAGE=taglish   # or english | tagalog
```
Then rebuild + restart as above.

---

## Manual Operations

### Generate draft only (no Facebook post)

```bash
curl -X POST http://localhost:3001/generate
curl http://localhost:3001/history
```

### Publish immediately

```bash
cd /opt/fb-auto-poster/clients/daily-wings
npm run publish
```

### Publish existing draft by ID

```bash
curl -X POST http://localhost:3001/publish \
  -H "Content-Type: application/json" \
  -d '{"id":"PASTE_POST_ID"}'
```

### Sync new Facebook photos

Run when client uploads new photos to their Page:

```bash
curl -X POST http://localhost:3001/photos/sync
curl http://localhost:3001/photos
```

---

## Update App Code from GitHub

When you push changes to GitHub and want them on the VPS:

```bash
cd /opt/fb-auto-poster/clients/daily-wings
git pull
npm install
npm run build
pm2 restart fb-autopost-daily-wings
```

### Update all clients (future)

```bash
for dir in /opt/fb-auto-poster/clients/*/; do
  cd "$dir"
  git pull && npm install && npm run build
  pm2 restart "fb-autopost-$(basename "$dir")"
done
```

---

## Reading Logs

### PM2 logs (stdout/stderr)

```bash
pm2 logs fb-autopost-daily-wings
```

### App log files

```bash
tail -f /opt/fb-auto-poster/clients/daily-wings/logs/app-$(date +%Y-%m-%d).log
tail -f /opt/fb-auto-poster/clients/daily-wings/logs/error-$(date +%Y-%m-%d).log
```

### What to look for

| Log message | Meaning |
|---|---|
| `Selected topic "..."` | Topic picked for today |
| `Published Facebook post ...` | Success |
| `Failed to publish` | Facebook API error — check token |
| `Scheduler started` | Cron is active |
| `Daily job triggered` | 11 AM job ran |
| `Tagged photo ...` | Vision tagging during photo sync |

---

## Troubleshooting

| Problem | What to do |
|---|---|
| No post at 11 AM | `pm2 list` — must be `online`. Check `pm2 logs` at 11:05 AM |
| `facebookConnected: false` | Regenerate Page token → update `.env` → restart |
| Facebook error `#200` | Wrong token type — use Page token from `me/accounts` |
| OpenAI quota error | Add billing credit at platform.openai.com |
| App keeps restarting | `pm2 logs` — usually missing `.env` variable |
| Caption too AI-sounding | Adjust `restaurant.ts` brandVoice or `POST_LANGUAGE` |
| Same photo repeats | Client needs more photos on Facebook Page |
| Photo sync fails | Re-run `/photos/sync` — images download locally before Vision |
| Port in use | Change `PORT` in `.env` or stop conflicting process |

---

## Scheduler Settings

In `.env`:

```env
CRON_SCHEDULE=0 11 * * *      # 11:00 AM daily
TIMEZONE=Asia/Manila
SCHEDULER_ENABLED=true
AUTO_PUBLISH=true             # false = draft only, no auto-publish
```

### Change posting time

Example — post at 6 PM instead:

```env
CRON_SCHEDULE=0 18 * * *
```

Rebuild not required for `.env` scheduler changes — just `pm2 restart`.

---

## Costs Monitor

| Service | Check usage |
|---|---|
| OpenAI | [platform.openai.com/usage](https://platform.openai.com/usage) |
| DigitalOcean | Droplet billing dashboard |
| Facebook API | Free |

---

## Related Docs

- [INDEX.md](./INDEX.md) — master documentation index
- [DEPLOY_DAILY_WINGS.md](./DEPLOY_DAILY_WINGS.md) — initial deployment
- [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md) — add more clients
- [CLIENT_ONBOARDING.md](./CLIENT_ONBOARDING.md) — new customer checklist
