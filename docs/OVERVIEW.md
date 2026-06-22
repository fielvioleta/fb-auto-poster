# Application Overview

Quick reference for what this app does, what it needs, and where things live.

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

```bash
npm run build          # after code or config changes
npm start              # run server + scheduler
npm run publish        # test: generate + post now
curl -X POST .../photos/sync   # first-time photo setup
curl .../history       # see past posts
```

---

## Docs Index

- [README.md](../README.md) — full setup and API reference
- [CLIENT_ONBOARDING.md](./CLIENT_ONBOARDING.md) — onboard a new client / sell to other businesses
- [.env.example](../.env.example) — all environment variables
