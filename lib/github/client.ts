const GITHUB_API_URL = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimited: boolean,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new GitHubApiError("GITHUB_TOKEN is not configured", 503, false);
  return token;
}

export async function githubFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, GITHUB_API_URL), {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${getGitHubToken()}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const rateLimited =
      response.status === 429 ||
      (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
    throw new GitHubApiError(
      rateLimited ? "GitHub API rate limit exceeded" : `GitHub API request failed (${response.status})`,
      response.status,
      rateLimited,
    );
  }

  return (await response.json()) as T;
}
