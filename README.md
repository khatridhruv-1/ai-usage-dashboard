# AI Usage Dashboard + Auto Screenshot Reporter

Internal AI analytics platform tracking **Cursor**, **Claude**, and **OpenAI** usage with a dark analytics dashboard and automated daily screenshot reports delivered to **Google Chat** at 7 PM IST.

## Architecture

```
Next.js Dashboard  →  Express API  →  PostgreSQL
                            ↑
              Playwright Worker → R2 → Google Chat
```

**Two dashboard modes (production pattern):**

| Route | Purpose |
|-------|---------|
| `/dashboard` | Interactive analytics (sidebar, filters-ready) |
| `/cursor` | Cursor management report — plan quota, daily tables, model breakdown (session token) |
| `/report/daily` | Fixed 1600×1200 viewport for screenshots — no scroll |
| `/report/cursor` | Full-page Cursor report layout for Playwright screenshots (1600px wide) |

## Monorepo Structure

```
apps/
  dashboard/          # Next.js 15 UI
  api/                # Express aggregation API
  screenshot-worker/  # Playwright + cron pipeline
packages/
  db/                 # Prisma + PostgreSQL
  analytics/          # Usage aggregation engine
  ui/                 # Shared formatters
```

## Live Claude + Cursor Data

Add credentials to **`apps/api/.env`** then restart the API.

### Cursor (pick one method)

| Plan | Variable | How to get it |
|------|----------|----------------|
| **Personal / Pro** (recommended) | `CURSOR_SESSION_TOKEN` | Sign in at [cursor.com](https://cursor.com) → DevTools → Application → Cookies → copy `WorkosCursorSessionToken` |
| **Enterprise team** | `CURSOR_ADMIN_API_KEY` | [cursor.com/dashboard](https://cursor.com/dashboard) → API Keys → **Team** tab → Admin scope |

Optional: `CURSOR_TEAM_ID=0` (personal, default), `CURSOR_USER_ID` (fallback if account lookup fails), `CURSOR_DISPLAY_NAME` (name shown on the Cursor report — email still comes from your Cursor account).

### Claude

| Variable | Where to get it |
|----------|-----------------|
| `ANTHROPIC_ADMIN_API_KEY` | [Claude Console](https://console.anthropic.com) → Admin API key (`sk-ant-admin...`, org admin only) |

```bash
# Manual sync (clears demo seed data by default)
curl -X POST http://localhost:4000/api/sync/run \
  -H "x-internal-token: $INTERNAL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clearSeed": true}'
```

- **Claude**: pulls daily token usage + costs from Anthropic Admin API
- **Cursor (session)**: uses Cursor dashboard APIs with your session cookie — works on personal Pro accounts
- **Cursor (admin)**: pulls per-request events from Enterprise Team Admin API
- Auto-sync runs **hourly** (`SYNC_CRON`) and on API startup (`SYNC_ON_START`)

Use **Sync now** on the dashboard after adding credentials. Refresh `CURSOR_SESSION_TOKEN` if sync returns 401.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
cp .env.example .env
```

### 3. Initialize database

```bash
npm run db:push
npm run db:seed
```

### 4. Run services (3 terminals)

```bash
npm run dev:api
npm run dev:dashboard
```

Open http://localhost:3000/dashboard

### 5. Test screenshot reports

```bash
npm exec --workspace=screenshot-worker playwright install chromium
npm run screenshot          # daily analytics report
npm run screenshot:cursor   # full Cursor usage report (all sections)
```

On the `/cursor` page, use **Download screenshot** to capture the report via Playwright (requires API + dashboard running).
Set `CURSOR_SCREENSHOT_ENABLED=true` to also capture the Cursor report after the daily scheduled pipeline.

### 6. Full daily pipeline (aggregate → screenshot → R2 → Chat)

```bash
npm run report:generate
```

### 7. Cursor report to Google Chat (screenshot → R2 → Chat)

```bash
npm run report:cursor
```

Runs locally when API + dashboard are up. In production, GitHub Actions runs this **Mon–Fri at 7:30 PM IST** after you push to GitHub.

### 8. Local scheduler (Mon–Fri 7:30 PM IST)

```bash
npm run schedule --workspace=screenshot-worker
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/usage/daily?date=today` | Daily metrics + charts data |
| `POST` | `/api/usage/log` | Log usage (requires `x-internal-token`) |
| `POST` | `/api/report/generate` | Aggregate & store daily report |
| `POST` | `/api/report/complete` | Upload screenshot + send Chat |
| `POST` | `/api/google-chat/send` | Manual Chat notification |
| `POST` | `/api/cursor/report/complete` | Upload Cursor screenshot to R2 + post Google Chat card |

### Log usage from your apps

```bash
curl -X POST http://localhost:4000/api/usage/log \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_API_TOKEN" \
  -d '{
    "provider": "claude",
    "model": "claude-sonnet-4-20250514",
    "tokensInput": 1200,
    "tokensOutput": 800,
    "cost": 0.04,
    "projectName": "usage-dashboard",
    "userEmail": "dev@company.com"
  }'
```

## Security

- Set `REPORT_ACCESS_TOKEN` — report route requires `?token=...` for Playwright
- Set `INTERNAL_API_TOKEN` — protects write endpoints
- Whitelist worker IP on production dashboard if needed

## Deployment

| Component | Platform |
|-----------|----------|
| Dashboard | Vercel |
| API + Scheduler | Railway |
| Database | Neon / Supabase |
| Screenshots | Cloudflare R2 |
| Notifications | Google Chat Webhook |

### Vercel env

```
DATABASE_URL
NEXT_PUBLIC_API_URL
REPORT_ACCESS_TOKEN
```

### Railway env

```
DATABASE_URL
INTERNAL_API_TOKEN
GOOGLE_CHAT_WEBHOOK_URL
R2_* (all R2 vars)
DASHBOARD_URL=https://your-dashboard.vercel.app
CURSOR_SESSION_TOKEN
CURSOR_DISPLAY_NAME
```

### Team mode (GitHub Actions only)

Teammates **fork** the repo, add secrets, and run — no Railway or R2 setup per user. Shared API/dashboard URLs live in `config/team-host.json` (host maintains this).

See **[TEAM_SETUP.md](./TEAM_SETUP.md)** for full host vs teammate steps.

**Teammate GitHub secrets:**

| Secret | Required |
|--------|----------|
| `INTERNAL_API_TOKEN` | From host |
| `CURSOR_SESSION_TOKEN` | Your Cursor cookie |
| `CURSOR_DISPLAY_NAME` | Your name on the report |
| `CURSOR_EMAIL` | Optional |
| `GOOGLE_CHAT_WEBHOOK_URL` | Your Chat space |

`R2_*` and `GOOGLE_CHAT_WEBHOOK_URL` on Railway are **host-only** (shared R2 bucket, per-user folders).

Workflow: `.github/workflows/cursor-report.yml` — Mon–Fri ~7:35 PM IST. Test via **Actions → Cursor Usage Report → Run workflow**.

## Release Phases

- **Phase 1 (MVP)** — Dashboard, logging, charts, screenshot, Google Chat ✅
- **Phase 2** — Team breakdown, project tracking
- **Phase 3** — Anomaly detection, cost forecasting, AI summaries
