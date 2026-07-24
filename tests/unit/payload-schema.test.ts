import { describe, expect, it } from "vitest";
import { pullRequestWebhookSchema } from "@/lib/github/payload-schema";
import mergedFixture from "../fixtures/pull-request-merged.json";
import closedFixture from "../fixtures/pull-request-closed.json";

describe("pullRequestWebhookSchema", () => {
  it("parses a valid merged pull-request payload", () => {
    const result = pullRequestWebhookSchema.safeParse(mergedFixture);
    expect(result.success).toBe(true);
  });

  it("parses a closed-but-unmerged payload and reports merged=false", () => {
    const result = pullRequestWebhookSchema.safeParse(closedFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pull_request.merged).toBe(false);
    }
  });

  it("does not require additions, deletions, changed_files, or merged_by", () => {
    const fullPullRequest = mergedFixture.pull_request as Record<string, unknown>;
    const omittedKeys = ["additions", "deletions", "changed_files", "merged_by"];
    const rest = Object.fromEntries(
      Object.entries(fullPullRequest).filter(([key]) => !omittedKeys.includes(key)),
    );
    const minimalPayload = {
      ...mergedFixture,
      pull_request: rest,
    };

    const result = pullRequestWebhookSchema.safeParse(minimalPayload);
    expect(result.success).toBe(true);
  });

  it("rejects a malformed payload missing required repository fields", () => {
    const malformed = { ...mergedFixture, repository: { id: 1 } };
    const result = pullRequestWebhookSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });
});
