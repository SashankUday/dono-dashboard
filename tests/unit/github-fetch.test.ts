import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMergedPullRequests } from "@/lib/github/fetch-merged-pull-requests";

const mergedPullRequest = {
  id: 42,
  number: 7,
  title: "Improve the dashboard",
  body: "Adds dashboard improvements.",
  html_url: "https://github.com/SashankUday/dono/pull/7",
  merged_at: "2026-07-21T10:00:00Z",
  base: { ref: "main" },
  user: { id: 1, login: "SashankUday", avatar_url: "https://avatars.example/sashank", type: "User" },
  merged_by: { id: 2, login: "reviewer", type: "User" },
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_TOKEN;
});

describe("fetchMergedPullRequests", () => {
  it("omits bots and creates stable event IDs", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/dono-dashboard/")) {
        return new Response(JSON.stringify([{ ...mergedPullRequest, id: 43, number: 8 }]), { status: 200 });
      }
      return new Response(
        JSON.stringify([mergedPullRequest, { ...mergedPullRequest, id: 44, number: 9, user: { ...mergedPullRequest.user, login: "dependabot[bot]", type: "Bot" } }]),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = await fetchMergedPullRequests(new Date("2026-07-22T12:00:00Z"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.id)).toEqual(["github:SashankUday/dono-dashboard:43"]);
    expect(events[0]).toMatchObject({ authorGithubLogin: "SashankUday", mergedByGithubLogin: "reviewer" });
  });

  it("rejects invalid GitHub payloads", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 })));

    await expect(fetchMergedPullRequests(new Date("2026-07-22T12:00:00Z"))).rejects.toThrow(
      "GitHub returned an invalid pull request payload",
    );
  });
});
