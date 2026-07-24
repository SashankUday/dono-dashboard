import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const FIXTURES: Record<string, string> = {
  merged: "pull-request-merged.json",
  closed: "pull-request-closed.json",
  redelivery: "pull-request-merged-redelivery.json",
};

async function main() {
  const fixtureName = process.argv[2];

  if (!fixtureName || !FIXTURES[fixtureName]) {
    console.error(`Usage: npm run webhook:fixture -- <${Object.keys(FIXTURES).join("|")}>`);
    process.exit(1);
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const fixturePath = path.join(__dirname, "..", "tests", "fixtures", FIXTURES[fixtureName]);
  const rawBody = readFileSync(fixturePath);

  const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const deliveryId = fixtureName === "redelivery" ? "delivery-fixture-42" : randomUUID();

  const response = await fetch(`${baseUrl}/api/github/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "pull_request",
      "X-GitHub-Delivery": deliveryId,
      "X-Hub-Signature-256": signature,
    },
    body: rawBody,
  });

  const body = await response.text();

  console.log(`Status: ${response.status}`);
  console.log(`Delivery ID: ${deliveryId}`);
  console.log(`Body: ${body}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
