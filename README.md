# Merge Arena

Built by Sashank

A database-free Next.js office display for celebrating merged pull requests.
GitHub is the source of truth: the browser polls `/api/dashboard` every 20
seconds, and that server-only route reads GitHub's REST API.

```text
GitHub repositories → Next.js dashboard API on Vercel → GitHub REST API
                                      ↓
                         dashboard aggregation → polling display
```

## Configure

Edit [config/merge-arena.ts](config/merge-arena.ts) to add repositories,
members, the weekly goal, feed size, bot accounts, and each repository's
privacy mode. `full` displays the title, `number_only` displays its number,
and `generic` displays a neutral message. Unknown and inactive authors remain
in the feed but do not count toward the team goal or scoreboard.

## Per-contributor merge sounds

Put each audio file in `public/audio/`, then assign it to that contributor in
`config/merge-arena.ts` using a root-relative path. For example:

```ts
members: {
  SashankUday: { displayName: "Sashank", active: true, mergeSoundFile: "/audio/sashank.mp3" },
  alex: { displayName: "Alex", active: true, mergeSoundFile: "/audio/alex.mp3" },
}
```

The GitHub login is matched case-insensitively. A contributor without a file,
or a file that cannot play, uses the existing short celebration tone instead.

Set one server-only environment variable locally and in Vercel:

```text
GITHUB_TOKEN=github_pat_or_installation_token
```

Use a fine-grained token with read access to Pull requests and Metadata, and
grant it access only to configured repositories. Never use a `NEXT_PUBLIC_`
prefix. `npm run dev` starts the app; no database, migrations, or seed data
are required.

## Testing and deployment

```bash
npm run test
npm run typecheck
npm run build
APP_BASE_URL=https://your-domain npm run verify:production
```

In Vercel, import the repository using the Next.js preset and set
`GITHUB_TOKEN` for Preview and Production. Builds do not require the token;
the route validates it only when a dashboard request runs. A 15-second
in-memory server cache reduces GitHub API calls across open displays. GitHub
failures return `502`; the display retains its last successful data and backs
off before retrying.

## GitHub webhooks

Configure each repository to send `pull_request` and `push` events to
`https://YOUR_DOMAIN/api/github/webhook`, and set the same secret in GitHub and
in the server-only `GITHUB_WEBHOOK_SECRET` environment variable. The endpoint
verifies GitHub's SHA-256 signature before reading the payload.

Only closed, merged pull requests whose base branch is `main` are accepted.
Only pushes to `refs/heads/main` are accepted; they cover direct pushes and
temporarily act as a fallback if a pull-request delivery is delayed. A PR event
replaces a matching push event by merge commit SHA, so it is counted once.

Webhook events are kept in process memory. The REST polling path remains the
durable source for merged PRs; use a shared durable event store before relying
on direct-push events across serverless instance restarts.

Open `/display` on the office computer. Select **Enable sound** once to allow
native in-page celebration audio; the preference persists
locally. For kiosk mode:

```bash
open -a "Google Chrome" --args --kiosk --app="https://YOUR_DOMAIN/display"
```
