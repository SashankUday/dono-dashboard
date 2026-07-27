import { mergeArenaConfig, type MergeArenaRepository } from "@/config/merge-arena";
import { getWeekRange } from "@/lib/time";
import type { PublicMergeEvent } from "@/lib/types";
import { GitHubApiError, githubFetch } from "./client";
import { isBotUser, publicTitle } from "./transform";
import { githubPullRequestsSchema, type GitHubPullRequest } from "./types";

function isWithinWeek(mergedAt: string, startsAt: Date, endsAt: Date): boolean {
  const date = new Date(mergedAt);
  return !Number.isNaN(date.valueOf()) && date >= startsAt && date <= endsAt;
}

function transformPullRequest(
  pullRequest: GitHubPullRequest,
  repository: MergeArenaRepository,
): PublicMergeEvent {
  const mergedAt = pullRequest.merged_at;
  if (!mergedAt) throw new Error("Cannot transform an unmerged pull request");
  const member = Object.entries(mergeArenaConfig.members).find(
    ([login]) => login.toLowerCase() === pullRequest.user.login.toLowerCase(),
  );

  return {
    id: `github:${repository.owner}/${repository.name}:${pullRequest.id}`,
    repositoryId: `${repository.owner}/${repository.name}`,
    repositoryDisplayName: repository.displayName,
    pullRequestNumber: pullRequest.number,
    publicTitle: publicTitle({ mode: repository.privacyMode, title: pullRequest.title, number: pullRequest.number }),
    pullRequestUrl: pullRequest.html_url,
    authorMemberId: pullRequest.user.login,
    authorGithubLogin: pullRequest.user.login,
    authorDisplayName: member?.[1].displayName ?? pullRequest.user.login,
    authorAvatarUrl: pullRequest.user.avatar_url ?? null,
    mergedByGithubLogin: pullRequest.merged_by?.login ?? null,
    mergedAt,
  };
}

async function fetchRepositoryMerges(
  repository: MergeArenaRepository,
  now: Date,
  botLogins: Set<string>,
): Promise<PublicMergeEvent[]> {
  try {
    const query = new URLSearchParams({ state: "closed", sort: "updated", direction: "desc", per_page: "100" });
    const payload = await githubFetch<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/pulls?${query}`,
    );
    const parsed = githubPullRequestsSchema.safeParse(payload);
    if (!parsed.success) throw new GitHubApiError("GitHub returned an invalid pull request payload", 502, false);
    const { startsAt, endsAt } = getWeekRange(now);

    return parsed.data
      .filter((pullRequest) => pullRequest.merged_at && isWithinWeek(pullRequest.merged_at, startsAt, endsAt))
      .filter((pullRequest) => !isBotUser(pullRequest.user, botLogins))
      .map((pullRequest) => transformPullRequest(pullRequest, repository));
  } catch (error) {
    console.error("github_repository_fetch_failed", {
      repository: `${repository.owner}/${repository.name}`,
      status: error instanceof GitHubApiError ? error.status : undefined,
    });
    throw error;
  }
}

export async function fetchMergedPullRequests(now: Date = new Date()): Promise<PublicMergeEvent[]> {
  const botLogins = new Set(mergeArenaConfig.botLogins.map((login) => login.toLowerCase()));
  const perRepository = await Promise.all(
    mergeArenaConfig.repositories.map((repository) => fetchRepositoryMerges(repository, now, botLogins)),
  );
  const eventIds = new Set<string>();

  return perRepository
    .flat()
    .filter((event) => {
      if (eventIds.has(event.id)) return false;
      eventIds.add(event.id);
      return true;
    })
    .sort((a, b) => new Date(b.mergedAt).valueOf() - new Date(a.mergedAt).valueOf());
}
