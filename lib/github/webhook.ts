import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mergeArenaConfig } from "@/config/merge-arena";
import { isBotUser } from "./transform";

const repositorySchema = z.object({ full_name: z.string().min(1) });
const githubUserSchema = z.object({ login: z.string().min(1), type: z.string().optional() });

const pullRequestPayloadSchema = z.object({
  action: z.string(),
  repository: repositorySchema,
  pull_request: z.object({
    merged: z.boolean(),
    base: z.object({ ref: z.string() }),
    user: githubUserSchema,
  }),
});

const pushPayloadSchema = z.object({
  ref: z.string(),
  repository: repositorySchema,
  sender: githubUserSchema,
});

export type WebhookProcessingResult = {
  accepted: boolean;
  reason: string;
  eventType: string | null;
  repository?: string;
  ref?: string;
  action?: string;
};

function configuredRepository(fullName: string): boolean {
  return mergeArenaConfig.repositories.some(
    (repository) => `${repository.owner}/${repository.name}`.toLowerCase() === fullName.toLowerCase(),
  );
}

export function verifyGitHubSignature(payload: string, signature: string | null, secret = process.env.GITHUB_WEBHOOK_SECRET): boolean {
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Validates webhook relevance and returns structured telemetry only. GitHub's
 * REST API is the durable source that the dashboard reads on its next poll.
 */
export function processGitHubWebhook(eventType: string | null, payload: unknown): WebhookProcessingResult {
  const botLogins = new Set(mergeArenaConfig.botLogins.map((login) => login.toLowerCase()));

  if (eventType === "pull_request") {
    const parsed = pullRequestPayloadSchema.safeParse(payload);
    if (!parsed.success) return { accepted: false, reason: "invalid_payload", eventType };
    const { pull_request: pullRequest, repository, action } = parsed.data;
    const result = { eventType, repository: repository.full_name, ref: pullRequest.base.ref, action };
    if (!configuredRepository(repository.full_name)) return { ...result, accepted: false, reason: "unconfigured_repository" };
    if (action !== "closed") return { ...result, accepted: false, reason: "action_not_closed" };
    if (!pullRequest.merged) return { ...result, accepted: false, reason: "pull_request_not_merged" };
    if (pullRequest.base.ref !== "main") return { ...result, accepted: false, reason: "base_not_main" };
    if (isBotUser(pullRequest.user, botLogins)) return { ...result, accepted: false, reason: "bot_author" };
    return { ...result, accepted: true, reason: "accepted_merged_pull_request" };
  }

  if (eventType === "push") {
    const parsed = pushPayloadSchema.safeParse(payload);
    if (!parsed.success) return { accepted: false, reason: "invalid_payload", eventType };
    const { repository, ref, sender } = parsed.data;
    const result = { eventType, repository: repository.full_name, ref };
    if (!configuredRepository(repository.full_name)) return { ...result, accepted: false, reason: "unconfigured_repository" };
    if (ref !== "refs/heads/main") return { ...result, accepted: false, reason: "ref_not_main" };
    if (isBotUser(sender, botLogins)) return { ...result, accepted: false, reason: "bot_sender" };
    return { ...result, accepted: true, reason: "accepted_main_push" };
  }

  return { accepted: false, reason: "unsupported_event", eventType };
}
