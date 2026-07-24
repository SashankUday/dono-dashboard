import { z } from "zod";

export const githubUserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  avatar_url: z.string().url().nullable().optional(),
  type: z.string().optional(),
});

export const pullRequestWebhookSchema = z.object({
  action: z.string(),
  number: z.number().int().positive(),
  pull_request: z.object({
    id: z.number().int().positive(),
    number: z.number().int().positive(),
    title: z.string(),
    html_url: z.string().url(),
    merged: z.boolean().nullable(),
    merged_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
    additions: z.number().int().nonnegative().optional(),
    deletions: z.number().int().nonnegative().optional(),
    changed_files: z.number().int().nonnegative().optional(),
    user: githubUserSchema,
    merged_by: githubUserSchema.nullable().optional(),
    base: z.object({
      ref: z.string(),
    }),
    head: z.object({
      ref: z.string(),
    }),
  }),
  repository: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  }),
});

export type PullRequestWebhookPayload = z.infer<typeof pullRequestWebhookSchema>;

export const pingWebhookSchema = z.object({
  zen: z.string().optional(),
  hook_id: z.number().optional(),
});
