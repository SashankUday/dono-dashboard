import "server-only";
import { z } from "zod";
import { repositoryAllowListSchema } from "@/lib/github/repository-allow-list";

const commaSeparatedIds = repositoryAllowListSchema;

const rawEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z
    .string()
    .min(32, "GITHUB_WEBHOOK_SECRET must be at least 32 characters"),
  GITHUB_ALLOWED_REPOSITORY_IDS: commaSeparatedIds,
  DEFAULT_PRIVACY_MODE: z.enum(["full", "number_only", "generic"]).default("number_only"),
  BOT_GITHUB_LOGINS: z
    .string()
    .default("dependabot[bot],renovate[bot],github-actions[bot]")
    .transform((value) =>
      new Set(
        value
          .split(",")
          .map((login) => login.trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const rawEnvSchemaWithGuards = rawEnvSchema.superRefine((value, ctx) => {
  if (value.SUPABASE_SECRET_KEY.startsWith("sb_publishable_")) {
    ctx.addIssue({
      code: "custom",
      path: ["SUPABASE_SECRET_KEY"],
      message: "A publishable key was supplied where a secret key is expected",
    });
  }

  if (value.NODE_ENV === "production" && value.GITHUB_ALLOWED_REPOSITORY_IDS.size === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["GITHUB_ALLOWED_REPOSITORY_IDS"],
      message: "Repository allow-list must not be empty in production",
    });
  }
});

function parseEnv() {
  const parsed = rawEnvSchemaWithGuards.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = parseEnv();

export type Env = typeof env;
