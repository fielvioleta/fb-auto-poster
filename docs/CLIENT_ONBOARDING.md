# Client Onboarding Guide

Use this checklist when setting up the Facebook Auto-Poster for **a new restaurant or business client** — whether you're deploying a separate instance per client or preparing for a future multi-tenant SaaS.

---

## Overview

Each client needs:

1. Their own **Facebook Page** and **Page access token**
2. Their own **restaurant profile** (name, menu, voice, topics)
3. Their own **`.env`** file (or tenant config in a database later)
4. Their own **server instance** (today) or tenant row (future SaaS)
5. **Photos on their Facebook Page** for image matching to work well

---

## Onboarding Checklist

Copy this checklist per client:

```
[ ] Client name: _______________________
[ ] Facebook Page name: _______________________
[ ] Facebook Page ID: _______________________
[ ] Page access token obtained and tested
[ ] OpenAI API key (shared or per-client)
[ ] restaurant.ts updated
[ ] .env created and filled
[ ] POST_LANGUAGE set (english / taglish / tagalog)
[ ] Photos uploaded to client's FB Page
[ ] npm run build && test publish successful
[ ] PM2 / hosting configured for 24/7
[ ] Client shown sample post on their Page
[ ] Handoff / support notes documented
```

---

## Step 1 — Gather Client Information

Ask the client for:

| Info | Example | Used in |
|---|---|---|
| Business name | Daily Wings & Cafe | `restaurant.ts` → `name` |
| Location / city | Dasmariñas, Cavite | Tagline, hashtags, weather coords |
| Menu items (real only) | Wings, Pasta, Burgers… | `restaurant.ts` → `menu` |
| Target audience | Students, families | `brandVoice.audience` |
| Preferred language | Taglish | `.env` → `POST_LANGUAGE` |
| Posting time | 11:00 AM | `.env` → `CRON_SCHEDULE`, `TIMEZONE` |
| Facebook Page admin access | Yes | Token setup |

**Do not** invent menu items, prices, or promos — only use what the client actually sells.

---

## Step 2 — Facebook Page Setup (Per Client)

Each client must have their **own Facebook Page**. You cannot post to multiple Pages with one Page token.

### Required permissions

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

### Get credentials

1. Client adds you as Page admin (or generates token themselves).
2. In [Graph API Explorer](https://developers.facebook.com/tools/explorer):
   ```
   me/accounts?fields=name,id,access_token
   ```
3. Record:
   - **Page ID** → `FACEBOOK_PAGE_ID`
   - **Page access_token** → `FACEBOOK_ACCESS_TOKEN`

> Always use the **Page token** from `me/accounts`, not a user token.

### System user (best for paying clients)

For long-lived tokens that don't expire every hour:

1. Add client's Page to your Business Manager (or client's own Business Manager).
2. Create a **system user**, assign **app + Page** with Full control.
3. Generate token with the three permissions above.
4. Still verify with `me/accounts` that the Page ID matches.

### Upload photos first

Before going live, make sure the client's Page has **10–50 food photos** (wings, pasta, interior, etc.). The app picks from these — no photos = text-only posts.

---

## Step 3 — Create Client `.env`

**Option A — Separate folder per client (recommended today)**

```bash
cp -r restaurant-fb-autopost restaurant-fb-autopost-clientname
cd restaurant-fb-autopost-clientname
cp .env.example .env
```

**Option B — Same codebase, swap `.env` per deploy**

Use a different `.env` file per client on separate VPS instances.

### Client `.env` template

```env
# ---- Required ----
OPENAI_API_KEY=sk-proj-...
FACEBOOK_PAGE_ID=CLIENT_PAGE_ID_HERE
FACEBOOK_ACCESS_TOKEN=CLIENT_PAGE_TOKEN_HERE
PORT=3001

# ---- Language ----
POST_LANGUAGE=taglish

# ---- Schedule ----
CRON_SCHEDULE=0 11 * * *
TIMEZONE=Asia/Manila
SCHEDULER_ENABLED=true
AUTO_PUBLISH=true

# ---- Location (for weather) ----
RESTAURANT_LAT=14.3294
RESTAURANT_LON=120.9366
WEATHER_ENABLED=true
HOLIDAY_ENABLED=true
HOLIDAY_COUNTRY_CODE=PH

# ---- Photos ----
PAGE_PHOTOS_ENABLED=true
PAGE_PHOTOS_MAX=50
```

### Shared vs per-client OpenAI key

| Approach | Pros | Cons |
|---|---|---|
| **One OpenAI key for all clients** | Simple billing for you | Harder to track per-client usage |
| **One OpenAI key per client** | Clear usage per client | More keys to manage |

---

## Step 4 — Edit Restaurant Profile

File: `src/config/restaurant.ts`

Update for each client:

```typescript
export const restaurantProfile: RestaurantProfile = {
  name: 'Client Restaurant Name',
  tagline: 'Short tagline here.',

  menu: [
    { name: 'Item 1', description: 'Short description.' },
    // only real menu items
  ],

  brandVoice: {
    tone: ['Casual', 'Friendly', 'Not salesy'],
    audience: ['Families', 'Students'],
    guardrails: [
      'Never invent discounts.',
      'Never invent promos or prices.',
      'Only promote menu items that actually exist.',
      'Never sound like AI or a marketing agency.',
    ],
  },

  topics: [
    'Chicken Wings',
    'Pasta',
    // customize per client — add/remove topics
    'Weekend Specials',
    'Behind the Scenes',
  ],
};
```

Rebuild after changes:

```bash
npm run build
```

---

## Step 5 — Test Before Handoff

Run in order:

```bash
npm run build
npm start
```

```bash
# 1. Health check
curl http://localhost:3001/health
# Expect: facebookConnected: true

# 2. Sync photos (first time — may take a few minutes)
curl -X POST http://localhost:3001/photos/sync

# 3. Preview a draft (costs ~1 OpenAI call)
curl -X POST http://localhost:3001/generate

# 4. Check draft in history
curl http://localhost:3001/history

# 5. Publish test post (or publish draft by id)
curl -X POST http://localhost:3001/publish -H "Content-Type: application/json" -d "{\"id\":\"DRAFT_ID\"}"
```

Verify on the client's Facebook Page:
- [ ] Post appears with correct caption tone
- [ ] Photo matches topic (if photos enabled)
- [ ] Language is correct (`POST_LANGUAGE`)
- [ ] No fake promos or prices in caption

---

## Step 6 — Deploy for 24/7 Posting

The server must stay running for the daily 11 AM post.

### Recommended: VPS + PM2 (per client)

```bash
pm2 start dist/index.js --name fb-autopost-CLIENTNAME
pm2 save
pm2 startup
```

### Cost to pass to client

| Item | Monthly estimate |
|---|---|
| VPS hosting | ~$5–7 USD |
| OpenAI usage | ~$0.05–0.20 USD |
| Your service fee | Your pricing |
| **Infrastructure total** | **~$5–8 USD** |

---

## Step 7 — Client Handoff

Give the client:

1. Link to their Facebook Page (they'll see daily posts appear).
2. Their posting schedule (e.g. "Every day at 11:00 AM").
3. What the app does in plain language:
   > "We automatically post once a day on your Facebook Page with a fresh caption and a photo from your page. Topics rotate so content doesn't repeat."
4. What you need from them ongoing:
   - Upload new food photos to their Page occasionally.
   - Notify you if they change menu items.
   - Regenerate Facebook token if posting stops (token expiry).

---

## Selling to Multiple Clients

### Today (single-tenant per deploy)

| Client | What to duplicate |
|---|---|
| Client A | Own VPS folder, own `.env`, own `restaurant.ts`, own PM2 process |
| Client B | Separate copy or separate server |

**Folder naming example:**
```
/opt/fb-autopost/daily-wings/
/opt/fb-autopost/cafe-xyz/
/opt/fb-autopost/milktea-shop/
```

Each runs on a different `PORT` if on the same server.

### Tomorrow (multi-tenant SaaS)

When you're ready to scale, migrate to:

| Piece | Change |
|---|---|
| Restaurant profile | Database table per tenant |
| `.env` secrets | Per-tenant encrypted credentials |
| `data/posts.json` | Per-tenant DB rows |
| Scheduler | One cron per tenant or job queue (BullMQ) |
| Onboarding | Web UI for Facebook OAuth + menu setup |
| Billing | Stripe per subscription |

The codebase is already structured for this (`container.ts` composition root, injectable stores).

---

## Per-Client Customization Quick Reference

| What client wants | What to change |
|---|---|
| English only posts | `POST_LANGUAGE=english` |
| Taglish posts | `POST_LANGUAGE=taglish` |
| Tagalog posts | `POST_LANGUAGE=tagalog` |
| Post at 6 PM | `CRON_SCHEDULE=0 18 * * *` |
| Draft only (approve manually) | `AUTO_PUBLISH=false` |
| No photos | `PAGE_PHOTOS_ENABLED=false` |
| Different city weather | `RESTAURANT_LAT`, `RESTAURANT_LON` |
| More menu items | Edit `restaurant.ts` → `menu` |
| Different post topics | Edit `restaurant.ts` → `topics` |

---

## Troubleshooting (Per Client)

| Problem | Solution |
|---|---|
| `#200` Facebook error | Wrong token type — use Page token from `me/accounts` |
| `me/accounts` empty | Re-generate token and select the Page during consent |
| Photo tagging fails | Fixed in app — images downloaded locally before Vision. Re-run `/photos/sync` |
| Caption too AI-sounding | Adjust `brandVoice` in `restaurant.ts`, try `POST_LANGUAGE` |
| Same photo repeats | Normal if library is small — client should upload more photos |
| Post didn't fire at 11 AM | Server was offline — use PM2 or VPS |
| OpenAI quota error | Add billing credit on OpenAI account |

---

## Security Reminders

- Never commit `.env` to git (already in `.gitignore`).
- Never share API keys in chat or screenshots.
- Rotate tokens if exposed.
- Use system user tokens for production clients.
- Each client's Page token should only access their Page.

---

## Support Script (What to Tell Clients)

> "Your Facebook page will get one automatic post every day at [TIME]. We use AI to write casual captions in [LANGUAGE] and pick a photo from photos you've already uploaded to your page. You don't need to do anything daily — just keep uploading new food photos to Facebook when you have them, and tell us if your menu changes."

---

## Related Files

| File | Purpose |
|---|---|
| `README.md` | Full technical documentation |
| `.env.example` | Environment variable template |
| `src/config/restaurant.ts` | Client brand, menu, topics |
| `data/posts.json` | Post history for this client |
| `data/pagePhotos.json` | Photo tags cache for this client |
