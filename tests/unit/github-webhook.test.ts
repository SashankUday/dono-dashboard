import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getWebhookEvents, processGitHubWebhook, resetWebhookEventsForTests, verifyGitHubSignature } from "@/lib/github/webhook";

const repository = { full_name: "jujmun/dono" };
const user = { login: "SashankUday", avatar_url: "https://avatars.example/sashank", type: "User" };

afterEach(() => {
  resetWebhookEventsForTests();
  delete process.env.GITHUB_WEBHOOK_SECRET;
});

describe("GitHub webhook processing", () => {
  it("accepts only merged, closed PRs targeting main and uses their contributor details", () => {
    const payload = {
      action: "closed",
      repository,
      pull_request: {
        id: 42,
        number: 7,
        title: "Improve the dashboard",
        body: "Adds the live status panel.",
        html_url: "https://github.com/jujmun/dono/pull/7",
        merged: true,
        merged_at: "2026-07-28T12:00:00Z",
        merge_commit_sha: "merge-sha",
        base: { ref: "main" },
        user,
        merged_by: { login: "reviewer", avatar_url: null, type: "User" },
      },
    };

    expect(processGitHubWebhook("pull_request", payload)).toBe("stored");
    expect(getWebhookEvents()).toMatchObject([
      {
        id: "github:jujmun/dono:42",
        authorGithubLogin: "SashankUday",
        publicTitle: "Improve the dashboard",
        contributionDescription: "Adds the live status panel.",
        pullRequestNumber: 7,
      },
    ]);

    expect(processGitHubWebhook("pull_request", { ...payload, action: "opened" })).toBe("ignored");
    expect(processGitHubWebhook("pull_request", { ...payload, pull_request: { ...payload.pull_request, merged: false } })).toBe("ignored");
    expect(processGitHubWebhook("pull_request", { ...payload, pull_request: { ...payload.pull_request, base: { ref: "develop" } } })).toBe("ignored");
  });

  it("keeps direct main pushes but removes a matching push fallback once its PR arrives", () => {
    const push = {
      ref: "refs/heads/main",
      repository,
      pusher: { name: "SashankUday" },
      sender: user,
      head_commit: {
        id: "merge-sha",
        message: "Fix production issue\n\nDetails",
        timestamp: "2026-07-28T12:00:00Z",
        url: "https://github.com/jujmun/dono/commit/merge-sha",
        author: { name: "Sashank" },
      },
      commits: [{ id: "merge-sha" }],
    };
    expect(processGitHubWebhook("push", { ...push, ref: "refs/heads/develop" })).toBe("ignored");
    expect(processGitHubWebhook("push", push)).toBe("stored");
    expect(getWebhookEvents()[0]).toMatchObject({ pullRequestNumber: null, authorGithubLogin: "SashankUday" });

    expect(
      processGitHubWebhook("pull_request", {
        action: "closed",
        repository,
        pull_request: {
          id: 42, number: 7, title: "Merged change", body: null, html_url: "https://github.com/jujmun/dono/pull/7",
          merged: true, merged_at: "2026-07-28T12:00:00Z", merge_commit_sha: "merge-sha", base: { ref: "main" }, user, merged_by: null,
        },
      }),
    ).toBe("stored");
    expect(getWebhookEvents()).toHaveLength(1);
    expect(getWebhookEvents()[0].pullRequestNumber).toBe(7);
  });

  it("verifies GitHub's SHA-256 signature", () => {
    process.env.GITHUB_WEBHOOK_SECRET = "webhook-secret";
    const payload = '{"hello":"world"}';
    expect(verifyGitHubSignature(payload, "sha256=1bad")).toBe(false);
    const signature = `sha256=${createHmac("sha256", "webhook-secret").update(payload).digest("hex")}`;
    expect(verifyGitHubSignature(payload, signature)).toBe(true);
  });
});
