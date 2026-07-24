import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubSignature(args: {
  rawBody: Buffer;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  const { rawBody, signatureHeader, secret } = args;

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  if (!secret) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;

  const actualBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
