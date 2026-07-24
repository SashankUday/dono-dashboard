import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyGitHubSignature } from "@/lib/github/signature";

const secret = "a".repeat(32);

function sign(body: Buffer, key: string) {
  return `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
}

describe("verifyGitHubSignature", () => {
  it("accepts a correct signature", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = sign(body, secret);

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: signature, secret }),
    ).toBe(true);
  });

  it("rejects a modified body", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = sign(body, secret);
    const tamperedBody = Buffer.from(JSON.stringify({ hello: "mallory" }));

    expect(
      verifyGitHubSignature({ rawBody: tamperedBody, signatureHeader: signature, secret }),
    ).toBe(false);
  });

  it("rejects a missing header", () => {
    const body = Buffer.from("{}");

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: null, secret }),
    ).toBe(false);
  });

  it("rejects a SHA-1 signature", () => {
    const body = Buffer.from("{}");

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: "sha1=deadbeef", secret }),
    ).toBe(false);
  });

  it("rejects a truncated signature", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = sign(body, secret).slice(0, -4);

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: signature, secret }),
    ).toBe(false);
  });

  it("rejects an empty secret", () => {
    const body = Buffer.from("{}");
    const signature = sign(body, secret);

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: signature, secret: "" }),
    ).toBe(false);
  });

  it("verifies a body containing a Unicode pull-request title", () => {
    const body = Buffer.from(
      JSON.stringify({ title: "Fix emoji rendering 🎉 — café résumé" }),
      "utf8",
    );
    const signature = sign(body, secret);

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: signature, secret }),
    ).toBe(true);
  });
});
