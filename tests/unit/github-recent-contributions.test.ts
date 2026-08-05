import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRecentContributions } from "@/lib/github/fetch-recent-contributions";

const mergedPullRequest = {
  id: 42,
  number: 7,
  title: "Merged dashboard change",
  body: "Adds the merged dashboard change.",
  html_url: "https://github.com/SashankUday/dono-dashboard/pull/7",
  merged_at: "2026-07-28T10:00:00Z",
  merge_commit_sha: "merged-sha",
  base: { ref: "main" },
  user: { id: 1, login: "SashankUday", avatar_url: "https://avatars.example/sashank", type: "User" },
  merged_by: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_TOKEN;
});

describe("fetchRecentContributions", () => {
  it("keeps direct main commits and excludes every commit belonging to a merged PR", async () => {
    process.env.GITHUB_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: URL | RequestInfo) => {
        const url = String(input);
        if (url.includes("/pulls?")) return new Response(JSON.stringify([mergedPullRequest]), { status: 200 });
        if (url.includes("/pulls/7/commits?")) {
          return new Response(
            JSON.stringify([
              {
                sha: "pr-commit-sha",
                html_url: "https://github.com/SashankUday/dono-dashboard/commit/pr-commit-sha",
                author: mergedPullRequest.user,
                commit: { message: "PR commit", author: { name: "Sashank", date: "2026-07-28T09:00:00Z" } },
              },
            ]),
            { status: 200 },
          );
        }
        if (url.includes("/commits?")) {
          return new Response(
            JSON.stringify([
              {
                sha: "direct-sha",
                html_url: "https://github.com/SashankUday/dono-dashboard/commit/direct-sha",
                author: mergedPullRequest.user,
                commit: { message: "Ship direct change\n\nContribution details", author: { name: "Sashank", date: "2026-07-28T11:00:00Z" } },
              },
              {
                sha: "merged-sha",
                html_url: "https://github.com/SashankUday/dono-dashboard/commit/merged-sha",
                author: mergedPullRequest.user,
                commit: { message: "Merge PR", author: { name: "Sashank", date: "2026-07-28T10:00:00Z" } },
              },
              {
                sha: "pr-commit-sha",
                html_url: "https://github.com/SashankUday/dono-dashboard/commit/pr-commit-sha",
                author: mergedPullRequest.user,
                commit: { message: "PR commit", author: { name: "Sashank", date: "2026-07-28T09:00:00Z" } },
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(null, { status: 404 });
      }),
    );

    const events = await fetchRecentContributions(new Date("2026-07-28T12:00:00Z"));

    expect(events.map((event) => event.id)).toEqual([
      "github:jujmun/dono:commit:direct-sha",
      "github:jujmun/dono:42",
    ]);
    expect(events[0]).toMatchObject({ pullRequestNumber: null, authorGithubLogin: "SashankUday", publicTitle: "Ship direct change" });
  });
});
