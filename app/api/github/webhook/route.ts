import { NextResponse } from "next/server";
import { processGitHubWebhook, verifyGitHubSignature } from "@/lib/github/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const eventType = request.headers.get("x-github-event");
  const payload = await request.text();
  console.info("github_webhook_received", { eventType, payloadBytes: payload.length });
  if (!verifyGitHubSignature(payload, request.headers.get("x-hub-signature-256"))) {
    console.warn("github_webhook_signature_rejected", { eventType });
    return NextResponse.json({ error: "Invalid GitHub webhook signature" }, { status: 401 });
  }
  console.info("github_webhook_signature_verified", { eventType });

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    console.warn("github_webhook_payload_rejected", { eventType, reason: "invalid_json" });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = processGitHubWebhook(eventType, body);
  const log = result.accepted ? console.info : console.warn;
  log("github_webhook_processed", result);
  return NextResponse.json({ accepted: result.accepted, reason: result.reason });
}
