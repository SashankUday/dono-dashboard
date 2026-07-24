import { z } from "zod";

export const mergeEventRowSchema = z.object({
  id: z.string().uuid(),
  repository_id: z.string().uuid(),
  pull_request_number: z.number().int().positive(),
  public_title: z.string(),
  pull_request_url: z.string().nullable(),
  author_member_id: z.string().uuid(),
  author_github_login: z.string(),
  author_avatar_url: z.string().nullable(),
  merged_by_github_login: z.string().nullable(),
  merged_at: z.string(),
  is_visible: z.boolean(),
});

export type MergeEventRow = z.infer<typeof mergeEventRowSchema>;
