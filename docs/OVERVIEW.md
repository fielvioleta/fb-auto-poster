# Application Overview

Quick reference for what this app does, what it needs, and where things live.

**Full documentation index:** [INDEX.md](./INDEX.md)

---

## One-Sentence Summary

**Automatically writes and publishes one Facebook post per day for a restaurant** — AI caption + real photo from the Page — with no daily manual work.

---

## Daily Flow

```
11:00 AM (scheduler)
    │
    ├─ Pick topic (no repeat within 30 days)
    ├─ Check weather / holiday / weekend
    ├─ Generate caption (OpenAI)
    ├─ Pick photo from FB Page library (Vision + AI match)
    ├─ Save to data/posts.json
    └─ Publish to Facebook Page
```

---

## What You Must Provide

| # | Item | File / location |
|---|---|---|
| 1 | OpenAI API key | `.env` → `OPENAI_API_KEY` |
| 2 | Facebook Page ID | `.env` → `FACEBOOK_PAGE_ID` |
| 3 | Facebook Page token | `.env` → `FACEBOOK_ACCESS_TOKEN` |
| 4 | Restaurant details | `src/config/restaurant.ts` |
| 5 | Server running 24/7 | VPS + PM2 (for auto daily post) |

---

## Production (Daily Wings)

| Item | Value |
|---|---|
| VPS path | `/opt/fb-auto-poster/clients/daily-wings` |
| PM2 | `fb-autopost-daily-wings` |
| Schedule | 11:00 AM Asia/Manila daily |
| GitHub | https://github.com/fielvioleta/fb-auto-poster |

---

## Key Files

| Path | What it stores |
|---|---|
| `.env` | Secrets and settings |
| `src/config/restaurant.ts` | Name, menu, voice, topics |
| `src/config/postLanguage.ts` | English / Taglish / Tagalog styles |
| `data/posts.json` | All generated and published posts |
| `data/pagePhotos.json` | Facebook photos + Vision tags |
| `logs/` | Daily app and error logs |

---

## Commands You'll Use Most

### Local (development)

```bash
npm run build
npm start
npm run publish
curl -X POST http://localhost:3001/generate
```

### VPS (production)

```bash
pm2 list
pm2 logs fb-autopost-daily-wings
pm2 restart fb-autopost-daily-wings
curl http://localhost:3001/health
```

---

## All Documentation

| Doc | Purpose |
|---|---|
| [INDEX.md](./INDEX.md) | **Start here** — master index |
| [README.md](../README.md) | Full technical setup + API |
| [DEPLOY_DAILY_WINGS.md](./DEPLOY_DAILY_WINGS.md) | VPS deployment walkthrough |
| [VPS_MULTI_CLIENT.md](./VPS_MULTI_CLIENT.md) | Multi-client hosting (Option A) |
| [CLIENT_ONBOARDING.md](./CLIENT_ONBOARDING.md) | Onboard new restaurant clients |
| [OPERATIONS.md](./OPERATIONS.md) | Logs, restart, updates, troubleshooting |
| [.env.example](../.env.example) | All environment variables |
