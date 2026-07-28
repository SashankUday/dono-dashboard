import { mergeArenaConfig, type MergeArenaRepository } from "@/config/merge-arena";
import { getWeekRange } from "@/lib/time";
import type { PublicMergeEvent } from "@/lib/types";
import { GitHubApiError, githubFetch } from "./client";
import { fetchMergedPullRequests } from "./fetch-merged-pull-requests";
import { isBotUser, publicTitle } from "./transform";
import { githubCommitsSchema, type GitHubCommit } from "./types";

function isWithinWeek(timestamp: string, startsAt: Date, endsAt: Date): boolean {
  const date = new Date(timestamp);
  return !Number.isNaN(date.valueOf()) && date >= startsAt && date <= endsAt;
}

function configuredMember(login: string) {
  return Object.entries(mergeArenaConfig.members).find(([memberLogin]) => memberLogin.toLowerCase() === login.toLowerCase());
}

function transformCommit(commit: GitHubCommit, repository: MergeArenaRepository): PublicMergeEvent {
  const githubLogin = commit.author?.login ?? commit.commit.author.name;
  const member = configuredMember(githubLogin);
  const title = commit.commit.message.split("\n", 1)[0]?.trim() || "A new change";

  return {
    id: `github:${repository.owner}/${repository.name}:commit:${commit.sha}`,
    repositoryId: `${repository.owner}/${repository.name}`,
    repositoryDisplayName: repository.displayName,
    pullRequestNumber: null,
    publicTitle: publicTitle({ mode: repository.privacyMode, title, number: 0 }),
    contributionDescription: repository.privacyMode === "full" ? commit.commit.message.trim() || null : null,
    pullRequestUrl: commit.html_url,
    authorMemberId: githubLogin,
    authorGithubLogin: githubLogin,
    authorDisplayName: member?.[1].displayName ?? githubLogin,
    authorAvatarUrl: commit.author?.avatar_url ?? null,
    mergedByGithubLogin: null,
    mergedAt: commit.commit.author.date,
    commitSha: commit.sha,
  };
}

async function fetchRepositoryMainCommits(
  repository: MergeArenaRepository,
  now: Date,
  botLogins: Set<string>,
  mergedCommitShas: Set<string>,
): Promise<PublicMergeEvent[]> {
  const { startsAt, endsAt } = getWeekRange(now);
  const query = new URLSearchParams({
    sha: "main",
    since: startsAt.toISOString(),
    until: endsAt.toISOString(),
    per_page: "100",
  });
  const payload = await githubFetch<unknown>(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/commits?${query}`,
  );
  const parsed = githubCommitsSchema.safeParse(payload);
  if (!parsed.success) throw new GitHubApiError("GitHub returned an invalid commit payload", 502, false);

  return parsed.data
    .filter((commit) => !mergedCommitShas.has(commit.sha))
    .filter((commit) => isWithinWeek(commit.commit.author.date, startsAt, endsAt))
    .filter((commit) => !commit.author || !isBotUser(commit.author, botLogins))
    .map((commit) => transformCommit(commit, repository));
}

/**
 * GitHub is the durable event store. This intentionally does not depend on
 * webhook process memory, which is not shared across Vercel function instances.
 */
export async function fetchRecentContributions(now: Date = new Date()): Promise<PublicMergeEvent[]> {
  const botLogins = new Set(mergeArenaConfig.botLogins.map((login) => login.toLowerCase()));
  const mergedPullRequests = await fetchMergedPullRequests(now);
  const mergedCommitShas = new Set<string>();

  for (const event of mergedPullRequests) {
    if (event.commitSha) mergedCommitShas.add(event.commitSha);
  }

  const mainCommitEvents = await Promise.all(
    mergeArenaConfig.repositories.map((repository) => fetchRepositoryMainCommits(repository, now, botLogins, mergedCommitShas)),
  );
  const eventIds = new Set<string>();
  return [...mergedPullRequests, ...mainCommitEvents.flat()]
    .filter((event) => {
      if (eventIds.has(event.id)) return false;
      eventIds.add(event.id);
      return true;
    })
    .sort((a, b) => new Date(b.mergedAt).valueOf() - new Date(a.mergedAt).valueOf());
}
