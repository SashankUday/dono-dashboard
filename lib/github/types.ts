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
  html_url: string;
  merged_at: string | null;
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
    html_url: z.string(),
    merged_at: z.string().datetime().nullable(),
    user: githubUserSchema,
    merged_by: githubUserSchema.nullable().optional(),
  }),
);
import { z } from "zod";
