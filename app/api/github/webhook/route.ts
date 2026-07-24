import { NextResponse } from "next/server";
import { pullRequestWebhookSchema } from "@/lib/github/payload-schema";
import { verifyGitHubSignature } from "@/lib/github/signature";
import { transformMergeEvent, type PrivacyMode } from "@/lib/github/transform";
import { getServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookOutcome =
  | "ping"
  | "inserted"
  | "duplicate"
  | "ignored_event"
  | "ignored_not_merged"
  | "ignored_repository"
  | "invalid_signature"
  | "invalid_payload"
  | "database_error";

function logOutcome(fields: {
  event_name: string | null;
  delivery_id: string | null;
  repository_id?: number;
  pull_request_id?: number;
  outcome: WebhookOutcome;
  duration_ms: number;
  error_code?: string;
}) {
  console.log("merge_arena_webhook", fields);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  const eventName = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");
  const signature = request.headers.get("x-hub-signature-256");

  if (!eventName || !deliveryId || !signature) {
    return NextResponse.json({ error: "Missing GitHub webhook headers" }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  const signatureIsValid = verifyGitHubSignature({
    rawBody,
    signatureHeader: signature,
    secret: env.GITHUB_WEBHOOK_SECRET,
  });

  if (!signatureIsValid) {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      outcome: "invalid_signature",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let unknownPayload: unknown;

  try {
    unknownPayload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (eventName === "ping") {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      outcome: "ping",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true });
  }

  if (eventName !== "pull_request") {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      outcome: "ignored_event",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true, ignored: "event" });
  }

  const parsed = pullRequestWebhookSchema.safeParse(unknownPayload);

  if (!parsed.success) {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      outcome: "invalid_payload",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        error: "Invalid pull-request payload",
        issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (payload.action !== "closed" || payload.pull_request.merged !== true) {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      repository_id: payload.repository.id,
      pull_request_id: payload.pull_request.id,
      outcome: "ignored_not_merged",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true, ignored: "not_merged" });
  }

  if (!payload.pull_request.merged_at) {
    return NextResponse.json({ error: "Merged PR has no merged_at" }, { status: 422 });
  }

  if (!env.GITHUB_ALLOWED_REPOSITORY_IDS.has(payload.repository.id)) {
    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      repository_id: payload.repository.id,
      pull_request_id: payload.pull_request.id,
      outcome: "ignored_repository",
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true, ignored: "repository" });
  }

  const supabase = getServerSupabase();

  const { data: existingRepository } = await supabase
    .from("repositories")
    .select("privacy_mode")
    .eq("github_repository_id", payload.repository.id)
    .maybeSingle();

  const privacyMode: PrivacyMode =
    (existingRepository?.privacy_mode as PrivacyMode | undefined) ?? env.DEFAULT_PRIVACY_MODE;

  const event = transformMergeEvent({
    deliveryId,
    payload,
    privacyMode,
    botLogins: env.BOT_GITHUB_LOGINS,
  });

  const { data, error } = await supabase.rpc("ingest_merge_event", { p_event: event });

  if (error) {
    console.error("merge_ingestion_failed", {
      deliveryId,
      repositoryId: payload.repository.id,
      pullRequestId: payload.pull_request.id,
      errorCode: error.code,
    });

    logOutcome({
      event_name: eventName,
      delivery_id: deliveryId,
      repository_id: payload.repository.id,
      pull_request_id: payload.pull_request.id,
      outcome: "database_error",
      duration_ms: Date.now() - startedAt,
      error_code: error.code,
    });

    return NextResponse.json({ error: "Database ingestion failed" }, { status: 500 });
  }

  logOutcome({
    event_name: eventName,
    delivery_id: deliveryId,
    repository_id: payload.repository.id,
    pull_request_id: payload.pull_request.id,
    outcome: "inserted",
    duration_ms: Date.now() - startedAt,
  });

  return NextResponse.json({ ok: true, eventId: data }, { status: 202 });
}
