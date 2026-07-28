export type GitHubUser = {
  id: number;
  login: string;
  avatar_url?: string | null;
  type?: string;
};

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string | null;
  merge_commit_sha?: string | null;
  base: { ref: string };
  user: GitHubUser;
  merged_by?: GitHubUser | null;
};

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string().min(1),
  avatar_url: z.string().nullable().optional(),
  type: z.string().optional(),
});

export const githubPullRequestsSchema = z.array(
  z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    html_url: z.string(),
    merged_at: z.string().datetime().nullable(),
    merge_commit_sha: z.string().nullable().optional(),
    base: z.object({ ref: z.string().min(1) }),
    user: githubUserSchema,
    merged_by: githubUserSchema.nullable().optional(),
  }),
);

export type GitHubCommit = {
  sha: string;
  html_url: string;
  author: GitHubUser | null;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
};

export const githubCommitsSchema = z.array(
  z.object({
    sha: z.string().min(1),
    html_url: z.string().url(),
    author: githubUserSchema.nullable(),
    commit: z.object({
      message: z.string(),
      author: z.object({ name: z.string().min(1), date: z.string().datetime() }),
    }),
  }),
);
import { z } from "zod";
