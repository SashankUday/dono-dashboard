import { describe, expect, it } from "vitest";
import { repositoryAllowListSchema } from "@/lib/github/repository-allow-list";

describe("repositoryAllowListSchema", () => {
  it("parses a valid comma-separated list of repository IDs", () => {
    const result = repositoryAllowListSchema.safeParse("123456789,987654321");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(new Set([123456789, 987654321]));
    }
  });

  it("trims whitespace around IDs", () => {
    const result = repositoryAllowListSchema.safeParse(" 123 , 456 ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(new Set([123, 456]));
    }
  });

  it("rejects an empty string", () => {
    expect(repositoryAllowListSchema.safeParse("").success).toBe(false);
  });

  it("rejects a non-integer entry", () => {
    expect(repositoryAllowListSchema.safeParse("123,abc").success).toBe(false);
  });

  it("rejects a zero or negative ID", () => {
    expect(repositoryAllowListSchema.safeParse("123,0").success).toBe(false);
    expect(repositoryAllowListSchema.safeParse("-5").success).toBe(false);
  });

  it("rejects duplicate IDs", () => {
    expect(repositoryAllowListSchema.safeParse("123,123").success).toBe(false);
  });
});
