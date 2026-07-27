export type PrivacyMode = "full" | "number_only" | "generic";

export type MergeArenaRepository = {
  owner: string;
  name: string;
  displayName: string;
  privacyMode: PrivacyMode;
};

export type MergeArenaMember = {
  displayName: string;
  active: boolean;
  /** A file in `public/`, referenced from the site root (for example, `/audio/alex.mp3`). */
  mergeSoundFile?: string;
};

export const mergeArenaConfig = {
  teamName: "Dono",
  weeklyGoal: 10,
  timezone: "Europe/London",
  celebrationSeconds: 8,
  feedSize: 10,
  pollingIntervalMs: 20_000,
  githubCacheMs: 15_000,
  repositories: [
    {
      owner: "jujmun",
      name: "dono",
      displayName: "Dono",
      privacyMode: "full",
    },
  ] satisfies readonly MergeArenaRepository[],
  members: {
    SashankUday: {
      displayName: "Sashank",
      active: true,
      mergeSoundFile: "public/audio/Sashank_Merging.mp3",
    },
  } satisfies Record<string, MergeArenaMember>,
  botLogins: ["dependabot[bot]", "renovate[bot]", "github-actions[bot]"],
} as const;
