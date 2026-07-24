export type PublicMergeEvent = {
  id: string;
  repositoryId: string;
  repositoryDisplayName: string;
  pullRequestNumber: number;
  publicTitle: string;
  pullRequestUrl: string | null;
  authorMemberId: string;
  authorGithubLogin: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  mergedByGithubLogin: string | null;
  mergedAt: string;
};

export type DashboardMember = {
  memberId: string;
  githubLogin: string;
  displayName: string;
  avatarUrl: string | null;
  mergeCount: number;
  celebrationStyle: Record<string, unknown>;
};

export type DashboardResponse = {
  generatedAt: string;
  settings: {
    teamName: string;
    weeklyGoal: number;
    timezone: "Europe/London";
    celebrationSeconds: number;
    feedSize: number;
    soundEnabled: boolean;
  };
  week: {
    startsAt: string;
    endsAt: string;
    totalMerges: number;
    goalProgress: number;
    goalReached: boolean;
  };
  members: DashboardMember[];
  recentMerges: PublicMergeEvent[];
};
