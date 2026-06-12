# Team setup — GitHub Actions only (no Railway per user)

One person (**host**) runs the shared API + dashboard + R2. Everyone else only forks the repo and adds GitHub secrets.

## Host (you) — one-time

1. Deploy **api** + **dashboard** on Railway (already done).
2. Configure **R2** on the **api** service only (shared bucket for all users).
3. Set `INTERNAL_API_TOKEN` on Railway **api** (generate a long random string).
4. Update `config/team-host.json` with your public URLs:

```json
{
  "apiUrl": "https://api-production-df50.up.railway.app",
  "dashboardUrl": "https://dashboard-production-f011.up.railway.app"
}
```

5. On Railway **dashboard** service, set `INTERNAL_API_TOKEN` to the **same value** as the API (Playwright sends this header to open `/report/cursor`). Optional: `REPORT_ACCESS_TOKEN` as a URL fallback.

6. Share with teammates (privately):
   - `INTERNAL_API_TOKEN` (same value as Railway api)
   - Link to fork this repo

You do **not** need `CURSOR_SESSION_TOKEN` on Railway unless you use the live dashboard yourself.

### Host GitHub secrets (if you run reports from your repo)

| Secret | Required |
|--------|----------|
| `INTERNAL_API_TOKEN` | Yes — must match Railway **api** and **dashboard** |
| `CURSOR_SESSION_TOKEN` | Yes |
| `CURSOR_DISPLAY_NAME` | Yes |
| `GOOGLE_CHAT_WEBHOOK_URL` | Yes |
| `REPORT_ACCESS_TOKEN` | Optional — use if set on Railway dashboard |
| `CURSOR_EMAIL` | Optional |

---

## Teammate — 5 minutes

1. **Fork** this repository to your GitHub account.
2. Open **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | What to put |
|--------|-------------|
| `INTERNAL_API_TOKEN` | From host (shared) |
| `CURSOR_SESSION_TOKEN` | Your Cursor cookie: [cursor.com](https://cursor.com) → DevTools → Application → Cookies → `WorkosCursorSessionToken` |
| `CURSOR_DISPLAY_NAME` | Your name on the report |
| `CURSOR_EMAIL` | Your email (optional; auto-detected from Cursor if omitted) |
| `GOOGLE_CHAT_WEBHOOK_URL` | Your Google Chat space webhook |

3. **Actions → Cursor Usage Report → Run workflow** to test.
4. Scheduled runs: **Mon–Fri 7:30 PM IST** automatically.

No Railway, no R2, no database setup required.

---

## What happens when a teammate runs the workflow

```
GitHub Actions (their secrets)
  → Screenshot via shared dashboard (their Cursor token in headers)
  → Upload to host's R2 (per-user folder)
  → Google Chat (their webhook)
```

Screenshots are stored under:

`cursor-reports/<email-or-name>/YYYY/MM/cursor-YYYY-MM-DD.png`

---

## Refreshing Cursor cookie

`CURSOR_SESSION_TOKEN` expires when you log out of Cursor. Update the GitHub secret and re-run the workflow.
