# Merge Arena

A full-screen office display that celebrates pull requests when they're
merged. Built with Next.js 16 (App Router), TypeScript, Supabase (Postgres +
Realtime), and Framer Motion, per `merge_arena_engineering_specification.md`.

Credits the **pull-request author**, not whoever clicked merge. Emphasises a
shared weekly team goal over individual rankings — this is a celebration
screen, not a performance dashboard.

## How it works

```text
GitHub repository webhook
        │
Next.js Route Handler on Vercel  (/api/github/webhook)
        │
HMAC verification + repository allow-list
        │
Atomic Supabase RPC (ingest_merge_event)
        │
Postgres merge_events
        │
Supabase Realtime
        │
Full-screen Next.js office display (/display)
```

## Setup

### 1. Supabase

1. Create a new Supabase project (dedicated to this app).
2. Apply the migrations in `supabase/migrations/` in order (via the SQL
   editor, or `supabase db push` with the Supabase CLI).
3. Confirm `merge_events` is in the `supabase_realtime` publication (the
   migration adds it automatically).
4. Grab the project URL, the publishable (anon) key, and the secret
   (service-role) key.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — safe
  for the browser.
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` — server-only, never exposed to the
  client.
- `GITHUB_WEBHOOK_SECRET` — at least 32 random bytes, e.g.
  `openssl rand -hex 32`.
- `GITHUB_ALLOWED_REPOSITORY_IDS` — comma-separated, immutable numeric
  GitHub repository IDs (find via
  `https://api.github.com/repos/OWNER/REPO`). Required and validated at
  startup; production deploys fail if empty.
- `DEFAULT_PRIVACY_MODE` — `full`, `number_only`, or `generic`.
- `BOT_GITHUB_LOGINS` — comma-separated bot logins to hide from the display.

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. GitHub webhook

For each participating repository: **Settings → Webhooks → Add webhook**.

- Payload URL: `https://YOUR_DOMAIN/api/github/webhook`
- Content type: `application/json`
- Secret: the same value as `GITHUB_WEBHOOK_SECRET`
- Events: **Let me select individual events** → **Pull requests** only

GitHub can't reach `localhost` directly — use `gh webhook forward` (GitHub
CLI) or another HTTPS tunnel for local development, and use a fixture
instead for quick local testing:

```bash
npm run webhook:fixture -- merged
npm run webhook:fixture -- closed
npm run webhook:fixture -- redelivery
```

### 5. Demo data

```bash
NODE_ENV=development npm run seed:demo
```

Seeds clearly-marked `[DEMO]` merge events into a **development** Supabase
project only — the script refuses to run with `NODE_ENV=production`.

## Testing

```bash
npm run test          # unit tests (Vitest)
npm run typecheck     # tsc --noEmit
npm run test:e2e      # Playwright, requires `npm run dev` + seeded data
```

Integration tests against a real development Supabase project live in
`tests/integration/` — see `tests/integration/README.md` for setup; they're
excluded from `npm run test` because they need live credentials.

## Deployment (Vercel)

1. Import the repository into Vercel, framework preset **Next.js**.
2. Add all variables from `.env.example` as production environment
   variables. Deployment validation fails if `GITHUB_WEBHOOK_SECRET` is
   under 32 characters, `SUPABASE_SECRET_KEY` is missing, the repository
   allow-list is empty, or a publishable key is supplied where a secret key
   is expected.
3. Deploy.
4. `APP_BASE_URL=https://your-domain npm run verify:production`
5. Point the GitHub webhook at the production URL and confirm the `ping`
   delivery returns `200`.
6. Merge a test pull request and confirm: GitHub shows `202`, one database
   row exists, the display updates without a refresh, one celebration
   plays, and redelivering the same webhook creates no duplicate.

Run the office computer in kiosk mode:

```bash
open -a "Google Chrome" --args --kiosk --app="https://YOUR_DOMAIN/display"
```

Never put GitHub, Supabase, or Vercel credentials on the office computer —
it only needs the public `/display` URL.

## Administration

There's no admin UI in the MVP (by design — see the spec's non-goals).
Operate directly against Postgres (Supabase Table Editor or SQL):

- **Add a repository**: add its numeric ID to
  `GITHUB_ALLOWED_REPOSITORY_IDS` and redeploy. Its `repositories` row is
  created automatically on first merge; then set `display_name` and
  `privacy_mode` as desired.
- **Activate a team member**: `update team_members set is_active = true
  where github_login = '...'`. New authors default to `is_active = false`
  so they don't inflate the weekly count until confirmed.
- **Hide titles for a sensitive repo**: set that repository's
  `privacy_mode` to `number_only` or `generic`.
- **Change the weekly goal**: `update dashboard_settings set weekly_goal =
  ...`.
- **Rotate the webhook secret**: generate a new secret, update it in both
  GitHub and `GITHUB_WEBHOOK_SECRET`, redeploy.

## Product boundaries

No lines-of-code, commit counts, working-hours tracking, or permanent
rankings. Weekly per-person counts are informal team activity, framed as
"shipped" / "this week", never "top performer" or "productivity score".
