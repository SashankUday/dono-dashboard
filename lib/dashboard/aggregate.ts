import { mergeArenaConfig } from "@/config/merge-arena";
import { getWeekRange } from "@/lib/time";
import type { DashboardMember, DashboardResponse, PublicMergeEvent } from "@/lib/types";

function configuredMember(login: string) {
  return Object.entries(mergeArenaConfig.members).find(([memberLogin]) => memberLogin.toLowerCase() === login.toLowerCase());
}

export function aggregateDashboard(events: PublicMergeEvent[], now: Date = new Date()): DashboardResponse {
  const { startsAt, endsAt } = getWeekRange(now);
  const weeklyEvents = events
    .filter((event) => {
      const mergedAt = new Date(event.mergedAt);
      return !Number.isNaN(mergedAt.valueOf()) && mergedAt >= startsAt && mergedAt <= endsAt;
    })
    .sort((a, b) => new Date(b.mergedAt).valueOf() - new Date(a.mergedAt).valueOf());
  const membersByLogin = new Map<string, DashboardMember>();
  let totalMerges = 0;

  for (const event of weeklyEvents) {
    const member = configuredMember(event.authorGithubLogin);
    // Unknown and inactive authors remain visible in the feed but do not count toward the team goal.
    if (!member || !member[1].active) continue;

    totalMerges += 1;
    const [githubLogin, config] = member;
    const existing = membersByLogin.get(githubLogin.toLowerCase());
    if (existing) {
      existing.mergeCount += 1;
    } else {
      membersByLogin.set(githubLogin.toLowerCase(), {
        memberId: githubLogin,
        githubLogin,
        displayName: config.displayName,
        avatarUrl: event.authorAvatarUrl,
        mergeCount: 1,
        celebrationStyle: {},
      });
    }
  }

  const members = Array.from(membersByLogin.values()).sort(
    (a, b) => b.mergeCount - a.mergeCount || a.displayName.localeCompare(b.displayName),
  );
  const goalProgress = mergeArenaConfig.weeklyGoal > 0 ? Math.min(1, totalMerges / mergeArenaConfig.weeklyGoal) : 0;

  return {
    generatedAt: now.toISOString(),
    settings: {
      teamName: mergeArenaConfig.teamName,
      weeklyGoal: mergeArenaConfig.weeklyGoal,
      timezone: mergeArenaConfig.timezone,
      celebrationSeconds: mergeArenaConfig.celebrationSeconds,
      feedSize: mergeArenaConfig.feedSize,
      soundEnabled: true,
    },
    week: {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      totalMerges,
      goalProgress,
      goalReached: totalMerges >= mergeArenaConfig.weeklyGoal,
    },
    members,
    recentMerges: weeklyEvents.slice(0, mergeArenaConfig.feedSize),
  };
}
