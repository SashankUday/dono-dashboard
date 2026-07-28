import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mergeArenaConfig, type MergeArenaRepository } from "@/config/merge-arena";
import type { PublicMergeEvent } from "@/lib/types";
import { isBotUser, publicTitle } from "./transform";

const githubUserSchema = z.object({
  login: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
  type: z.string().optional(),
});

const repositorySchema = z.object({ full_name: z.string().min(1) });

const pullRequestPayloadSchema = z.object({
  action: z.string(),
  repository: repositorySchema,
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string().url(),
    merged: z.boolean(),
    merged_at: z.string().datetime().nullable(),
    merge_commit_sha: z.string().nullable(),
    base: z.object({ ref: z.string() }),
    user: githubUserSchema,
    merged_by: githubUserSchema.nullable(),
  }),
});

const pushPayloadSchema = z.object({
  ref: z.string(),
  repository: repositorySchema,
  pusher: z.object({ name: z.string().min(1) }),
  sender: githubUserSchema,
  head_commit: z
    .object({
      id: z.string().min(1),
      message: z.string(),
      timestamp: z.string().datetime(),
      url: z.string().url(),
      author: z.object({ name: z.string().min(1) }),
    })
    .nullable(),
  commits: z.array(z.object({ id: z.string().min(1) })).default([]),
});

type StoredWebhookEvent = PublicMergeEvent & { commitSha: string | null; source: "pull_request" | "push" };

declare global {
  var mergeArenaWebhookEvents: Map<string, StoredWebhookEvent> | undefined;
}

function eventStore(): Map<string, StoredWebhookEvent> {
  globalThis.mergeArenaWebhookEvents ??= new Map();
  return globalThis.mergeArenaWebhookEvents;
}

function configuredRepository(fullName: string): MergeArenaRepository | undefined {
  return mergeArenaConfig.repositories.find((repository) => `${repository.owner}/${repository.name}`.toLowerCase() === fullName.toLowerCase());
}

function configuredMember(login: string) {
  return Object.entries(mergeArenaConfig.members).find(([memberLogin]) => memberLogin.toLowerCase() === login.toLowerCase());
}

function description(mode: MergeArenaRepository["privacyMode"], value: string | null): string | null {
  return mode === "full" ? value?.trim() || null : null;
}

function store(event: StoredWebhookEvent) {
  const events = eventStore();
  // A merged PR is authoritative. Remove any earlier fallback event for the same merge commit.
  if (event.source === "pull_request" && event.commitSha) {
    for (const [id, existing] of events) {
      if (existing.source === "push" && existing.commitSha === event.commitSha) events.delete(id);
    }
  }
  if (event.source === "push" && event.commitSha) {
    for (const existing of events.values()) {
      if (existing.source === "pull_request" && existing.commitSha === event.commitSha) return;
    }
  }
  events.set(event.id, event);
}

export function verifyGitHubSignature(payload: string, signature: string | null, secret = process.env.GITHUB_WEBHOOK_SECRET): boolean {
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function processGitHubWebhook(eventName: string | null, payload: unknown): "stored" | "ignored" {
  const botLogins = new Set(mergeArenaConfig.botLogins.map((login) => login.toLowerCase()));

  if (eventName === "pull_request") {
    const parsed = pullRequestPayloadSchema.safeParse(payload);
    if (!parsed.success) return "ignored";
    const { pull_request: pullRequest, repository } = parsed.data;
    const configured = configuredRepository(repository.full_name);
    if (!configured || parsed.data.action !== "closed" || !pullRequest.merged || pullRequest.base.ref !== "main") return "ignored";
    if (!pullRequest.merged_at || isBotUser(pullRequest.user, botLogins)) return "ignored";
    const member = configuredMember(pullRequest.user.login);
    store({
      id: `github:${repository.full_name}:${pullRequest.id}`,
      repositoryId: repository.full_name,
      repositoryDisplayName: configured.displayName,
      pullRequestNumber: pullRequest.number,
      publicTitle: publicTitle({ mode: configured.privacyMode, title: pullRequest.title, number: pullRequest.number }),
      contributionDescription: description(configured.privacyMode, pullRequest.body),
      pullRequestUrl: pullRequest.html_url,
      authorMemberId: pullRequest.user.login,
      authorGithubLogin: pullRequest.user.login,
      authorDisplayName: member?.[1].displayName ?? pullRequest.user.login,
      authorAvatarUrl: pullRequest.user.avatar_url ?? null,
      mergedByGithubLogin: pullRequest.merged_by?.login ?? null,
      mergedAt: pullRequest.merged_at,
      commitSha: pullRequest.merge_commit_sha,
      source: "pull_request",
    });
    return "stored";
  }

  if (eventName === "push") {
    const parsed = pushPayloadSchema.safeParse(payload);
    if (!parsed.success) return "ignored";
    const { head_commit: commit, repository } = parsed.data;
    const configured = configuredRepository(repository.full_name);
    if (!configured || parsed.data.ref !== "refs/heads/main" || !commit || isBotUser(parsed.data.sender, botLogins)) return "ignored";
    const member = configuredMember(parsed.data.sender.login);
    store({
      id: `github:${repository.full_name}:commit:${commit.id}`,
      repositoryId: repository.full_name,
      repositoryDisplayName: configured.displayName,
      pullRequestNumber: null,
      publicTitle: publicTitle({ mode: configured.privacyMode, title: commit.message.split("\n", 1)[0] || "A new change", number: 0 }),
      contributionDescription: description(configured.privacyMode, commit.message),
      pullRequestUrl: commit.url,
      authorMemberId: parsed.data.sender.login,
      authorGithubLogin: parsed.data.sender.login,
      authorDisplayName: member?.[1].displayName ?? parsed.data.sender.login,
      authorAvatarUrl: parsed.data.sender.avatar_url ?? null,
      mergedByGithubLogin: null,
      mergedAt: commit.timestamp,
      commitSha: commit.id,
      source: "push",
    });
    return "stored";
  }

  return "ignored";
}

export function getWebhookEvents(): PublicMergeEvent[] {
  return Array.from(eventStore().values())
    .map((event) => ({
      id: event.id,
      repositoryId: event.repositoryId,
      repositoryDisplayName: event.repositoryDisplayName,
      pullRequestNumber: event.pullRequestNumber,
      publicTitle: event.publicTitle,
      contributionDescription: event.contributionDescription,
      pullRequestUrl: event.pullRequestUrl,
      authorMemberId: event.authorMemberId,
      authorGithubLogin: event.authorGithubLogin,
      authorDisplayName: event.authorDisplayName,
      authorAvatarUrl: event.authorAvatarUrl,
      mergedByGithubLogin: event.mergedByGithubLogin,
      mergedAt: event.mergedAt,
    }))
    .sort((a, b) => new Date(b.mergedAt).valueOf() - new Date(a.mergedAt).valueOf());
}

export function resetWebhookEventsForTests() {
  eventStore().clear();
}
