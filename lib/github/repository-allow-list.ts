import { z } from "zod";

export const repositoryAllowListSchema = z
  .string()
  .min(1, "GITHUB_ALLOWED_REPOSITORY_IDS must not be empty")
  .transform((value, ctx) => {
    const parts = value.split(",").map((part) => part.trim());
    const ids: number[] = [];

    for (const part of parts) {
      if (!/^\d+$/.test(part)) {
        ctx.addIssue({
          code: "custom",
          message: `"${part}" is not a positive integer repository ID`,
        });
        return z.NEVER;
      }

      const id = Number(part);

      if (id <= 0) {
        ctx.addIssue({
          code: "custom",
          message: `"${part}" is not a positive integer repository ID`,
        });
        return z.NEVER;
      }

      ids.push(id);
    }

    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "GITHUB_ALLOWED_REPOSITORY_IDS contains duplicate IDs",
      });
      return z.NEVER;
    }

    return uniqueIds;
  });
