import { describe, it, expect, beforeAll } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import mergedFixture from "../fixtures/pull-request-merged.json";
import closedFixture from "../fixtures/pull-request-closed.json";

// This suite exercises the live webhook route against a real, dedicated
// development Supabase project. It is skipped unless the required
// environment variables are present so `npm run test` (unit tests only)
// stays hermetic. See tests/integration/README.md for setup instructions.
const baseUrl = process.env.APP_BASE_URL;
const secret = process.env.GITHUB_WEBHOOK_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const canRun = Boolean(baseUrl && secret && supabaseUrl && supabaseSecretKey);

function sign(body: string, key: string) {
  return `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
}

async function sendWebhook(payload: unknown, deliveryId: string) {
  const body = JSON.stringify(payload);
  return fetch(`${baseUrl}/api/github/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "pull_request",
      "X-GitHub-Delivery": deliveryId,
      "X-Hub-Signature-256": sign(body, secret!),
    },
    body,
  });
}

describe.skipIf(!canRun)("webhook ingestion (integration)", () => {
  const supabase = canRun
    ? createClient(supabaseUrl!, supabaseSecretKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  beforeAll(async () => {
    if (!supabase) return;
    await supabase.from("merge_events").delete().eq("github_pull_request_id", mergedFixture.pull_request.id);
  });

  it("creates exactly one row for a merged PR and no row for a duplicate delivery", async () => {
    const deliveryId = randomUUID();

    const first = await sendWebhook(mergedFixture, deliveryId);
    expect(first.status).toBe(202);

    const duplicate = await sendWebhook(mergedFixture, deliveryId);
    expect(duplicate.status).toBe(200);

    const { data, error } = await supabase!
      .from("merge_events")
      .select("id")
      .eq("github_pull_request_id", mergedFixture.pull_request.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("ignores a closed-but-unmerged PR", async () => {
    const response = await sendWebhook(closedFixture, randomUUID());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ignored).toBe("not_merged");
  });
});
