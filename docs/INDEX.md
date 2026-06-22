# Documentation Index

Master reference for the **Facebook Auto-Poster** project. Start here when you need to review setup, deployment, or operations.

**GitHub:** https://github.com/fielvioleta/fb-auto-poster

---

## Quick Links

| I want to… | Read this |
|---|---|
| Understand what the app does | [OVERVIEW.md](./OVERVIEW.md) |
| Set up from scratch (local) | [README.md](../README.md) |
| Deploy Daily Wings on VPS | [DEPLOY_DAILY_WINGS.md](./DEPLOY_DAILY_WINGS.md) |
| Add another restaurant client | [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md) + [CLIENT_ONBOARDING.md](./CLIENT_ONBOARDING.md) |
| Day-to-day ops (logs, restart, updates) | [OPERATIONS.md](./OPERATIONS.md) |
| All environment variables | [.env.example](../.env.example) |

---

## What This Application Does

Automatically generates and publishes **one Facebook post per day** for a restaurant:

1. Rotates topics (no repeat within 30 days)
2. Writes a casual AI caption (English, Taglish, or Tagalog)
3. Picks a real photo from the Facebook Page library
4. Publishes to the Page via Meta Graph API
5. Saves history to `data/posts.json`

Default schedule: **11:00 AM Asia/Manila** daily.

---

## Architecture (Current Setup)

### Single client (Daily Wings — live)

```
DigitalOcean VPS (Singapore, $6/mo)
└── /opt/fb-auto-poster/clients/daily-wings/
    ├── .env                    ← secrets (never in GitHub)
    ├── src/config/restaurant.ts
    ├── data/posts.json
    ├── data/pagePhotos.json
    ├── logs/
    └── PM2: fb-autopost-daily-wings (port 3001)
```

### Multi-client (future — Option A)

```
/opt/fb-auto-poster/clients/
├── daily-wings/     → pm2: fb-autopost-daily-wings
├── cafe-xyz/        → pm2: fb-autopost-cafe-xyz
└── milktea-abc/     → pm2: fb-autopost-milktea-abc
```

One folder + one PM2 process per client. See [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md).

---

## Required Credentials (Every Client)

| Variable | Where to get it |
|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `FACEBOOK_PAGE_ID` | Graph API Explorer → `me/accounts?fields=name,id` |
| `FACEBOOK_ACCESS_TOKEN` | Same response → Page `access_token` (**not** user token) |

---

## Daily Wings — Live Deployment Record

| Item | Value |
|---|---|
| Client slug | `daily-wings` |
| VPS folder | `/opt/fb-auto-poster/clients/daily-wings` |
| PM2 process | `fb-autopost-daily-wings` |
| Port | `3001` (internal) |
| Schedule | `0 11 * * *` @ `Asia/Manila` |
| Language | `POST_LANGUAGE=taglish` (in `.env`) |
| Facebook Page | Daily Wings - Dasmariñas |
| Repo | https://github.com/fielvioleta/fb-auto-poster |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Server | Express |
| AI captions | OpenAI (`gpt-4o-mini`) |
| AI photo tags | OpenAI Vision (once per photo) |
| Publishing | Meta Graph API |
| Scheduler | node-cron |
| Process manager | PM2 |
| Storage | JSON files (`data/`) |
| Logging | Winston (daily rotate) |

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Server + Facebook connectivity |
| POST | `/generate` | Draft only (no publish) |
| POST | `/publish` | Publish (or generate + publish) |
| GET | `/history` | Post history |
| GET | `/analytics` | Monthly stats |
| GET | `/photos` | Cached Page photos + tags |
| POST | `/photos/sync` | Fetch + tag photos from Facebook |

---

## Project Folder Structure

```
fb-auto-poster/
├── src/
│   ├── config/          env, restaurant profile, language
│   ├── services/        openai, facebook, photos, content
│   ├── routes/          API endpoints
│   ├── scheduler/       daily cron
│   └── utils/           logger, retry, etc.
├── data/                posts.json, pagePhotos.json (per deploy)
├── logs/                daily log files (per deploy)
├── docs/                all documentation (this folder)
├── scripts/vps/         VPS helper scripts
├── .env.example         env template
└── README.md            main technical readme
```

---

## Hosting Decision Record

| Option | Verdict |
|---|---|
| **VPS + PM2** | ✅ **Chosen** — works with zero code changes |
| Railway / Render | Good alternative, always-on required |
| Vercel | ❌ Not recommended — needs refactor (no persistent disk, no long-running cron) |

Estimated cost: **~$6 USD/month** VPS + pennies for OpenAI.

---

## Document Map

```
docs/
├── INDEX.md                 ← you are here (master index)
├── OVERVIEW.md              quick summary
├── DEPLOY_DAILY_WINGS.md    first VPS deployment walkthrough
├── VPS_MULTI_CLIENT.md      multi-client hosting (Option A)
├── CLIENT_ONBOARDING.md     selling to new restaurants
└── OPERATIONS.md            logs, restart, updates, troubleshooting
```

---

## Common Commands Cheat Sheet

### On VPS (Daily Wings)

```bash
pm2 list
pm2 logs fb-autopost-daily-wings
pm2 restart fb-autopost-daily-wings
curl http://localhost:3001/health
curl http://localhost:3001/history
```

### After config change

```bash
cd /opt/fb-auto-poster/clients/daily-wings
nano .env                          # or restaurant.ts
npm run build
pm2 restart fb-autopost-daily-wings
```

### Manual test post

```bash
cd /opt/fb-auto-poster/clients/daily-wings
npm run publish
```

---

## Security Reminders

- `.env` is in `.gitignore` — never commit API keys
- Use **Page tokens**, not user tokens
- Rotate keys if ever exposed in chat or screenshots
- VPS: SSH key login recommended over password

---

## Changelog (Documentation)

| Date | Change |
|---|---|
| 2026-06-22 | Initial app + GitHub push |
| 2026-06-22 | Photo matching (Option 2), language modes |
| 2026-06-22 | VPS multi-client docs + Daily Wings deployment |
| 2026-06-22 | Daily Wings deployed live on DigitalOcean + PM2 |
