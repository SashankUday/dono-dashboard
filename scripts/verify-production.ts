import "dotenv/config";

async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    console.error(`✗ ${label}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function main() {
  const baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    console.error("APP_BASE_URL must be set to the deployed URL, e.g. https://merge-arena.example.com");
    process.exit(1);
  }

  await check("Display route responds", async () => {
    const response = await fetch(`${baseUrl}/display`);
    if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);
  });

  await check("Dashboard API responds with expected shape", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Expected 200, got ${response.status}`);

    const body = await response.json();
    for (const field of ["generatedAt", "settings", "week", "members", "recentMerges"]) {
      if (!(field in body)) throw new Error(`Missing field "${field}" in dashboard response`);
    }
  });

  await check("Dashboard API sets no-store cache header", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard`, { cache: "no-store" });
    const cacheControl = response.headers.get("cache-control");
    if (!cacheControl || !cacheControl.includes("no-store")) {
      throw new Error(`Expected Cache-Control: no-store, got "${cacheControl}"`);
    }
  });

  await check("Webhook route rejects a request with missing headers", async () => {
    const response = await fetch(`${baseUrl}/api/github/webhook`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (response.status !== 400) {
      throw new Error(`Expected 400 for missing headers, got ${response.status}`);
    }
  });

  await check("Webhook route rejects an invalid signature", async () => {
    const response = await fetch(`${baseUrl}/api/github/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Event": "ping",
        "X-GitHub-Delivery": "verify-production-check",
        "X-Hub-Signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000",
      },
      body: JSON.stringify({ zen: "verify" }),
    });
    if (response.status !== 401) {
      throw new Error(`Expected 401 for invalid signature, got ${response.status}`);
    }
  });

  if (process.exitCode === 1) {
    console.error("\nOne or more production checks failed.");
  } else {
    console.log("\nAll production checks passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
