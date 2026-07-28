import { NextResponse } from "next/server";
import { processGitHubWebhook, verifyGitHubSignature } from "@/lib/github/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  if (!verifyGitHubSignature(payload, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid GitHub webhook signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = processGitHubWebhook(request.headers.get("x-github-event"), body);
  return NextResponse.json({ accepted: result === "stored" }, { status: 202 });
}
