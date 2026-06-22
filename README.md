# Restaurant Facebook Auto-Poster

Automatically generates and publishes **one unique Facebook post per day** for a restaurant — captions written by AI, photos picked from the Page's own library, published via the Meta Graph API. No manual posting required.

Built for **Daily Wings & Cafe** but designed so you can re-target it for other restaurants or sell it as a service to local businesses.

---

## What This Application Does

Every day (default **11:00 AM Asia/Manila**), the app:

1. **Picks a topic** (wings, pasta, burgers, coffee, weekend specials, etc.) — won't repeat the same topic within 30 days.
2. **Gathers context** — weather, holidays, weekend vibes (optional).
3. **Writes a caption** with OpenAI — casual owner voice, in your chosen language (`english`, `taglish`, or `tagalog`).
4. **Picks a photo** from your Facebook Page library — Vision AI tags photos once, then AI matches the best image to the topic.
5. **Publishes** to your Facebook Page — caption + photo, automatically.
6. **Saves everything** to `data/posts.json` and logs to `logs/`.

You can also trigger posts manually via API or CLI (`npm run publish`).

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Required Variables](#required-variables)
- [All Environment Variables](#all-environment-variables)
- [Restaurant Profile Setup](#restaurant-profile-setup)
- [OpenAI Setup](#openai-setup)
- [Facebook / Meta Setup](#facebook--meta-setup)
- [Photo Matching (Option 2)](#photo-matching-option-2)
- [Language Setting](#language-setting)
- [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Scheduler & 24/7 Hosting](#scheduler--247-hosting)
- [Costs](#costs)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Core

| Feature | Description |
|---|---|
| Daily auto-posting | One post per day via built-in cron scheduler |
| Topic rotation | 13+ topics, no repeat within 30 days |
| AI captions | Caption, call-to-action, 5 hashtags, emojis |
| Guardrails | Never invents discounts, prices, or promos |
| Facebook publishing | Meta Graph API with retry (×3) |
| Post history | Saved to `data/posts.json` |
| Logging | Winston daily rotating logs in `logs/` |
| REST API | Health, generate, publish, history, analytics, photos |

### Bonus

| Feature | Description |
|---|---|
| **Page photo matching** | Reuses real photos from your FB Page (Vision tags once, AI picks best match) |
| **Language modes** | `english`, `taglish`, or `tagalog` via `POST_LANGUAGE` |
| Weather-aware captions | Open-Meteo (free, no API key) |
| Holiday-aware posts | date.nager.at (free, no API key) |
| Weekend specials | Prioritized on Saturdays/Sundays |
| Configurable schedule | Cron expression + timezone |
| Monthly analytics | `GET /analytics` |

---

## Quick Start

**Prerequisites:** Node.js ≥ 18, npm, OpenAI API key, Facebook Page + Page access token.

```bash
git clone <your-repo-url> restaurant-fb-autopost
cd restaurant-fb-autopost
npm install
cp .env.example .env
```

Fill in the **3 required** variables in `.env` (see below), edit `src/config/restaurant.ts`, then:

```bash
npm run build
npm start
```

Test:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3001/photos/sync    # sync Page photos (first time)
curl -X POST http://localhost:3001/generate        # draft only
npm run publish                                  # generate + publish now
```

---

## Required Variables

These **must** be set in `.env` or the app will not start.

| Variable | What it is | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `FACEBOOK_PAGE_ID` | Your Facebook **Page** ID (numeric) | Graph API Explorer → `me/accounts?fields=name,id` |
| `FACEBOOK_ACCESS_TOKEN` | **Page** access token (not user token) | Same `me/accounts` response → use the Page's `access_token` field |

> **Important:** Use the **Page token** from `me/accounts`, not your personal user token. Posting with a user token causes error `#200`.

### Minimal `.env` example

```env
OPENAI_API_KEY=sk-proj-...
FACEBOOK_PAGE_ID=109195795325452
FACEBOOK_ACCESS_TOKEN=EAAG...
PORT=3001
POST_LANGUAGE=taglish
```

---

## All Environment Variables

Copy `.env.example` to `.env`. Full reference:

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `FACEBOOK_PAGE_ID` | ✅ | — | Facebook Page ID |
| `FACEBOOK_ACCESS_TOKEN` | ✅ | — | Page access token |
| `PORT` | | `3000` | HTTP server port |

### OpenAI

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_MODEL` | | `gpt-4o-mini` | Model for captions and photo tagging |

### Facebook

| Variable | Required | Default | Description |
|---|---|---|---|
| `FACEBOOK_GRAPH_VERSION` | | `v21.0` | Graph API version |

### Scheduler

| Variable | Required | Default | Description |
|---|---|---|---|
| `CRON_SCHEDULE` | | `0 11 * * *` | Cron expression (default = 11:00 daily) |
| `TIMEZONE` | | `Asia/Manila` | IANA timezone for scheduler |
| `SCHEDULER_ENABLED` | | `true` | Enable/disable in-app daily cron |
| `AUTO_PUBLISH` | | `true` | If `false`, scheduler only generates drafts |

### Language

| Variable | Required | Default | Description |
|---|---|---|---|
| `POST_LANGUAGE` | | `taglish` | Caption language: `english`, `taglish`, or `tagalog` |

### Logging

| Variable | Required | Default | Description |
|---|---|---|---|
| `LOG_LEVEL` | | `info` | `error`, `warn`, `info`, or `debug` |

### Context (weather & holidays)

| Variable | Required | Default | Description |
|---|---|---|---|
| `WEATHER_ENABLED` | | `true` | Weather-aware captions |
| `RESTAURANT_LAT` | | `14.5995` | Latitude for weather |
| `RESTAURANT_LON` | | `120.9842` | Longitude for weather |
| `HOLIDAY_ENABLED` | | `true` | Holiday-aware posts |
| `HOLIDAY_COUNTRY_CODE` | | `PH` | ISO country code for holidays |

### Photos

| Variable | Required | Default | Description |
|---|---|---|---|
| `PAGE_PHOTOS_ENABLED` | | `true` | Attach real photos from FB Page |
| `PAGE_PHOTOS_MAX` | | `50` | Max photos to fetch from Page |
| `IMAGE_PROMPT_ENABLED` | | `true` | Include AI image prompt in JSON (text only) |

---

## Restaurant Profile Setup

Edit `src/config/restaurant.ts` for each restaurant:

| Field | Purpose |
|---|---|
| `name` | Restaurant name (appears in AI captions) |
| `tagline` | Short description for AI context |
| `menu` | Items the AI is allowed to promote |
| `brandVoice.tone` | How the brand should sound |
| `brandVoice.audience` | Target customers |
| `brandVoice.guardrails` | Hard rules (no fake promos, etc.) |
| `topics` | Daily topic rotation list |

Only menu items listed in `menu` will be promoted.

---

## OpenAI Setup

1. Sign up at [platform.openai.com](https://platform.openai.com).
2. Add billing under **Settings → Billing** (required — free tier won't work for API).
3. Create an API key at **API Keys**.
4. Paste into `OPENAI_API_KEY`.

Recommended model: `gpt-4o-mini` (cheap, good for captions).

---

## Facebook / Meta Setup

### What you need

- A **Facebook Page** for the restaurant
- A **Meta developer app**
- A **Page access token** with permissions:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`

### Get Page ID and Page token

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer).
2. Select your app and generate a token with the permissions above.
3. Run:
   ```
   me/accounts?fields=name,id,access_token
   ```
4. Find your Page in the response:
   - `id` → `FACEBOOK_PAGE_ID`
   - `access_token` → `FACEBOOK_ACCESS_TOKEN`

### System user (recommended for production)

For a token that doesn't expire quickly, use a **Business Manager system user**:

1. Business Settings → **Users → System Users** → create user.
2. **Add Assets** → assign your **app** (Full control) and **Page** (Full control).
3. **Generate token** with `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
4. Still get `FACEBOOK_PAGE_ID` from `me/accounts` — use the **Page token** from that response for posting.

### Common errors

| Error | Fix |
|---|---|
| `#200` permission error | Use **Page token**, not user token. Need both `pages_manage_posts` + `pages_read_engagement`. |
| `me/accounts` empty | Grant Page access during token generation, or use system user with Page assigned. |
| Token expired | Regenerate Page token from `me/accounts`. |

---

## Photo Matching (Option 2)

When `PAGE_PHOTOS_ENABLED=true`:

1. Fetches photos uploaded to your Facebook Page.
2. Tags each photo **once** with OpenAI Vision (cached in `data/pagePhotos.json`).
3. AI picks the best photo for each post topic.
4. Publishes caption + photo together.

### First-time setup

```bash
curl -X POST http://localhost:3001/photos/sync
curl http://localhost:3001/photos
```

Each photo should show `description`, `tags`, and `taggedAt`.

### Notes

- Upload food photos to your Facebook Page first.
- Vision tagging is a **one-time cost per photo** (~$0.001 each).
- Same photo won't repeat within 14 days.
- Set `PAGE_PHOTOS_ENABLED=false` for caption-only posts.

---

## Language Setting

Set in `.env`:

```env
POST_LANGUAGE=taglish
```

| Value | Style |
|---|---|
| `english` | Pure English, casual owner voice |
| `taglish` | English + Tagalog mix (default) |
| `tagalog` | Tagalog captions |

Restart the server after changing.

---

## Running Locally

```bash
npm run dev          # development (hot reload)
npm run build        # compile TypeScript
npm start            # production server + scheduler

npm run generate     # one-off: generate draft only
npm run publish      # one-off: generate + publish

npm run typecheck
npm run lint
```

### Useful curl commands

```bash
curl http://localhost:3001/health
curl -X POST http://localhost:3001/generate
curl -X POST http://localhost:3001/publish
curl -X POST http://localhost:3001/publish -H "Content-Type: application/json" -d "{\"id\":\"POST_ID\"}"
curl http://localhost:3001/history
curl http://localhost:3001/analytics
curl http://localhost:3001/photos
curl -X POST http://localhost:3001/photos/sync
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/` | App info and endpoint list |
| GET | `/health` | Liveness + Facebook connectivity |
| POST | `/generate` | Generate draft (caption + photo pick), no publish |
| POST | `/publish` | Publish draft by `id`, or generate + publish if no body |
| GET | `/history` | Recent posts (`?limit=50`) |
| GET | `/analytics` | Monthly stats and topic breakdown |
| GET | `/photos` | Cached Page photos and Vision tags |
| POST | `/photos/sync` | Fetch + tag new photos from Facebook |

---

## Scheduler & 24/7 Hosting

The daily post runs **inside the Node process** (`node-cron`). The server **must be running at 11:00 AM** (or your `CRON_SCHEDULE` time).

| Setup | Works for daily posting? |
|---|---|
| `npm start` on your PC | Only if PC is on and app is running |
| VPS + PM2 | ✅ Recommended (~$5–7/month) |
| Render/Railway always-on | ✅ Works |
| Render/Railway free (sleeps) | ❌ Won't fire at 11 AM |

Alternative: set `SCHEDULER_ENABLED=false` and use OS cron to run `npm run publish` once daily.

---

## Costs

| Item | Estimate |
|---|---|
| OpenAI captions (daily) | ~$0.01/month |
| OpenAI photo tagging (one-time, ~50 photos) | ~$0.05–0.20 once |
| OpenAI photo pick (daily) | ~$0.01/month |
| Facebook API | Free |
| VPS hosting | ~$5–7/month |
| **Total (hosted)** | **~$5–8/month** |

---

## Deployment

### VPS (Ubuntu + PM2) — recommended

```bash
sudo apt update && sudo apt install -y nodejs npm
git clone <repo> && cd restaurant-fb-autopost
npm install && cp .env.example .env && nano .env
npm run build

sudo npm i -g pm2
pm2 start dist/index.js --name fb-autopost
pm2 save && pm2 startup
```

### Render

- Build: `npm install && npm run build`
- Start: `npm start`
- Use an **always-on** plan (not free tier that sleeps)
- Add all `.env` variables in the dashboard

### Railway

- Build: `npm install && npm run build`
- Start: `npm start`
- Keep service always-on, or use Railway Cron for `npm run publish`

---

## Documentation

| Document | Purpose |
|---|---|
| [README.md](README.md) | Main setup and reference (this file) |
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Quick one-page summary of what the app does |
| [docs/VPS_MULTI_CLIENT.md](docs/VPS_MULTI_CLIENT.md) | **Multi-client VPS layout** — folder structure, PM2 naming, ops |
| [docs/DEPLOY_DAILY_WINGS.md](docs/DEPLOY_DAILY_WINGS.md) | **Deploy Daily Wings** — first VPS + PM2 walkthrough |
| [docs/CLIENT_ONBOARDING.md](docs/CLIENT_ONBOARDING.md) | Onboard a new restaurant client (selling as a service) |
| [.env.example](.env.example) | Template for all environment variables |
| [scripts/vps/](scripts/vps/) | VPS helper scripts (`install-base.sh`, `new-client.sh`) |

---

## Architecture

```
config  →  services  →  routes / scheduler  →  app / index
             (openai, facebook, photos, content, storage, analytics)
```

- **Composition root:** `src/container.ts`
- **Orchestration:** `src/services/content/contentService.ts`
- **Restaurant profile:** `src/config/restaurant.ts`
- **Post history:** `data/posts.json`
- **Photo cache:** `data/pagePhotos.json`
- **Logs:** `logs/app-YYYY-MM-DD.log`

---

## License

MIT
