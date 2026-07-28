import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { processGitHubWebhook, verifyGitHubSignature } from "@/lib/github/webhook";

const repository = { full_name: "SashankUday/dono-dashboard" };
const user = { login: "SashankUday", type: "User" };

afterEach(() => {
  delete process.env.GITHUB_WEBHOOK_SECRET;
});

describe("GitHub webhook processing", () => {
  it("accepts only merged, closed PRs targeting main", () => {
    const payload = {
      action: "closed",
      repository,
      pull_request: { merged: true, base: { ref: "main" }, user },
    };

    expect(processGitHubWebhook("pull_request", payload)).toMatchObject({ accepted: true, reason: "accepted_merged_pull_request" });
    expect(processGitHubWebhook("pull_request", { ...payload, action: "opened" })).toMatchObject({ accepted: false, reason: "action_not_closed" });
    expect(processGitHubWebhook("pull_request", { ...payload, pull_request: { ...payload.pull_request, merged: false } })).toMatchObject({ accepted: false, reason: "pull_request_not_merged" });
    expect(processGitHubWebhook("pull_request", { ...payload, pull_request: { ...payload.pull_request, base: { ref: "develop" } } })).toMatchObject({ accepted: false, reason: "base_not_main" });
  });

  it("recognises direct main pushes and rejects other refs or repositories", () => {
    const payload = { ref: "refs/heads/main", repository, sender: user };
    expect(processGitHubWebhook("push", payload)).toMatchObject({ accepted: true, reason: "accepted_main_push", ref: "refs/heads/main" });
    expect(processGitHubWebhook("push", { ...payload, ref: "refs/heads/develop" })).toMatchObject({ accepted: false, reason: "ref_not_main" });
    expect(processGitHubWebhook("push", { ...payload, repository: { full_name: "someone/else" } })).toMatchObject({ accepted: false, reason: "unconfigured_repository" });
  });

  it("verifies GitHub's SHA-256 signature", () => {
    process.env.GITHUB_WEBHOOK_SECRET = "webhook-secret";
    const payload = '{"hello":"world"}';
    expect(verifyGitHubSignature(payload, "sha256=1bad")).toBe(false);
    const signature = `sha256=${createHmac("sha256", "webhook-secret").update(payload).digest("hex")}`;
    expect(verifyGitHubSignature(payload, signature)).toBe(true);
  });
});
