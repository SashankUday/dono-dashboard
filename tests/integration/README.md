# Integration tests

These tests run against a real (non-production) Supabase project and are not
part of the default `npm run test` unit-test pass, since they require live
credentials.

## Setup

1. Create a dedicated development Supabase project (never point this at
   production).
2. Apply `supabase/migrations/` to it.
3. Copy `.env.example` to `.env.test.local` and fill in the development
   project's URL and keys plus a test `GITHUB_WEBHOOK_SECRET`.
4. Run:

   ```bash
   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx vitest run tests/integration
   ```

## Required coverage

- first merge creates repository, author and event;
- second merge by the same author updates no administrator fields;
- duplicate delivery creates no duplicate;
- same PR with a different delivery ID creates no duplicate;
- closed but unmerged PR is ignored;
- disallowed repository is ignored;
- bot event is hidden (`is_visible = false`);
- privacy mode produces the expected public title;
- inactive author is omitted from the weekly team-member ranking;
- realtime emits one insert event per new merge.

Each test should call `POST /api/github/webhook` with a correctly signed
fixture (see `scripts/send-webhook-fixture.ts` for the signing logic) against
a locally running `next dev` server pointed at the development Supabase
project, then assert on the resulting rows via the service-role client.
