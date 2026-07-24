import { describe, expect, it } from "vitest";
import { publicTitle, isBotUser, transformMergeEvent } from "@/lib/github/transform";
import { pullRequestWebhookSchema } from "@/lib/github/payload-schema";
import mergedFixture from "../fixtures/pull-request-merged.json";

describe("publicTitle", () => {
  it("returns the real title in full mode", () => {
    expect(publicTitle({ mode: "full", title: "Improve onboarding", number: 42 })).toBe(
      "Improve onboarding",
    );
  });

  it("returns only the PR number in number_only mode", () => {
    expect(publicTitle({ mode: "number_only", title: "Improve onboarding", number: 42 })).toBe(
      "Pull request #42",
    );
  });

  it("returns a generic label in generic mode", () => {
    expect(publicTitle({ mode: "generic", title: "Improve onboarding", number: 42 })).toBe(
      "A new change",
    );
  });
});

describe("isBotUser", () => {
  const botLogins = new Set(["dependabot[bot]", "renovate[bot]", "github-actions[bot]"]);

  it("detects a GitHub-typed bot account", () => {
    expect(isBotUser({ login: "some-app[bot]", type: "Bot" }, botLogins)).toBe(true);
  });

  it("detects a configured bot login regardless of case", () => {
    expect(isBotUser({ login: "Dependabot[bot]", type: "User" }, botLogins)).toBe(true);
  });

  it("does not flag a regular human contributor", () => {
    expect(isBotUser({ login: "alex-dev", type: "User" }, botLogins)).toBe(false);
  });
});

describe("transformMergeEvent", () => {
  const payload = pullRequestWebhookSchema.parse(mergedFixture);

  it("produces the ingest RPC payload with privacy applied", () => {
    const event = transformMergeEvent({
      deliveryId: "delivery-1",
      payload,
      privacyMode: "number_only",
      botLogins: new Set(),
    });

    expect(event.public_title).toBe("Pull request #42");
    expect(event.author_github_login).toBe("alex-dev");
    expect(event.merged_by_github_login).toBe("priya-eng");
    expect(event.is_visible).toBe(true);
  });

  it("omits the raw title in generic mode", () => {
    const event = transformMergeEvent({
      deliveryId: "delivery-1",
      payload,
      privacyMode: "generic",
      botLogins: new Set(),
    });

    expect(event.pull_request_title).toBeNull();
    expect(event.public_title).toBe("A new change");
  });

  it("marks bot authors as not visible", () => {
    const botPayload = {
      ...payload,
      pull_request: {
        ...payload.pull_request,
        user: { id: 999, login: "dependabot[bot]", type: "Bot" as const },
      },
    };

    const event = transformMergeEvent({
      deliveryId: "delivery-2",
      payload: botPayload,
      privacyMode: "full",
      botLogins: new Set(["dependabot[bot]"]),
    });

    expect(event.is_visible).toBe(false);
  });
});
