import { describe, expect, it } from "vitest";
import { aggregateDashboard } from "@/lib/dashboard/aggregate";
import type { PublicMergeEvent } from "@/lib/types";

function event(id: string, login: string, mergedAt: string): PublicMergeEvent {
  return {
    id,
    repositoryId: "SashankUday/dono",
    repositoryDisplayName: "Dono",
    pullRequestNumber: Number(id.replace(/\D/g, "")) || 1,
    publicTitle: "A change",
    pullRequestUrl: null,
    authorMemberId: login,
    authorGithubLogin: login,
    authorDisplayName: login,
    authorAvatarUrl: null,
    mergedByGithubLogin: null,
    mergedAt,
  };
}

describe("aggregateDashboard", () => {
  it("counts active configured authors and keeps unknown authors in the feed", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    const response = aggregateDashboard(
      [
        event("one", "SashankUday", "2026-07-21T10:00:00Z"),
        event("two", "outside-contributor", "2026-07-21T11:00:00Z"),
      ],
      now,
    );

    expect(response.week.totalMerges).toBe(1);
    expect(response.members).toMatchObject([{ githubLogin: "SashankUday", displayName: "Sashank", mergeCount: 1 }]);
    expect(response.recentMerges.map((merge) => merge.authorGithubLogin)).toEqual([
      "outside-contributor",
      "SashankUday",
    ]);
  });

  it("excludes events outside the current London week and caps progress", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    const response = aggregateDashboard(
      [
        ...Array.from({ length: 11 }, (_, index) => event(`inside-${index}`, "SashankUday", "2026-07-21T10:00:00Z")),
        event("previous-week", "SashankUday", "2026-07-19T20:00:00Z"),
      ],
      now,
    );

    expect(response.week.totalMerges).toBe(11);
    expect(response.week.goalProgress).toBe(1);
    expect(response.week.goalReached).toBe(true);
  });
});
