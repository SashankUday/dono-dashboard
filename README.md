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

### Switch to another repository

To track a different repository locally, make these changes before deploying:

1. In `config/merge-arena.ts`, replace (or add) an entry in `repositories`:

   ```ts
   {
     owner: "GITHUB_OWNER",
     name: "REPOSITORY_NAME",
     displayName: "Name shown on the dashboard",
     privacyMode: "full",
   }
   ```

   The tracked branch is `main`. The repository comparison is case-insensitive,
   but the owner and name should match GitHub exactly for clarity.

2. Update `members` using each contributor's GitHub login as the key. Only
   active configured members count toward the weekly goal; anyone else still
   appears in the activity feed.

3. Update the fine-grained `GITHUB_TOKEN` to grant the new repository read
   access to **Pull requests**, **Contents**, and **Metadata**. Put the new
   token in `.env.local` and in Vercel's Preview and Production environments.

4. In the new repository's GitHub **Settings → Webhooks**, create or update a
   webhook pointing to `https://YOUR_DOMAIN/api/github/webhook`. Select
   **Pushes** and **Pull requests**, use `application/json`, and set its secret
   to the same `GITHUB_WEBHOOK_SECRET` value configured locally and in Vercel.

5. Run `npm run test && npm run typecheck && npm run build`, then deploy the
   dashboard. Keep the display open before making a test push so its new-event
   animation can run.

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

Set these server-only environment variables locally and in Vercel:

```text
GITHUB_TOKEN=github_pat_or_installation_token
GITHUB_WEBHOOK_SECRET=the_same_secret_configured_in_github
```

Use a fine-grained token with read access to Pull requests, Contents, and
Metadata, and grant it access only to configured repositories. Contents access
is needed to read the durable `main` commit history for direct pushes. Never
use a `NEXT_PUBLIC_` prefix. `npm run dev` starts the app; no database,
migrations, or seed data are required.

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
Only pushes to `refs/heads/main` are accepted. The endpoint validates and logs
each delivery, but does not keep event state in function memory. The dashboard
polls GitHub's durable PR and `main` commit history every 20 seconds, so it
works across Vercel function instances and restarts. A commit matching a merged
PR's merge SHA is counted once as the PR rather than a direct push.

Open `/display` on the office computer. Select **Enable sound** once to allow
native in-page celebration audio; the preference persists
locally. For kiosk mode:

```bash
open -a "Google Chrome" --args --kiosk --app="https://YOUR_DOMAIN/display"
```
