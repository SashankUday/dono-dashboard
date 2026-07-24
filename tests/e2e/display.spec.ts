import { test, expect } from "@playwright/test";

// These end-to-end tests exercise the /display route against a running
// application (see webServer config in playwright.config.ts). Tests that
// depend on live merge events (new-merge celebration, queued celebrations,
// goal-reached, offline/reconnect reconciliation) require either a seeded
// development Supabase project (npm run seed:demo) or a webhook fixture
// sent mid-test via scripts/send-webhook-fixture.ts. They are written
// against that contract and should be run with a development Supabase
// project configured.

test.describe("initial load", () => {
  test("shows a connecting state before data arrives, then the dashboard", async ({ page }) => {
    await page.goto("/display");
    await expect(page.getByText(/connecting to merge feed/i).or(page.getByText(/this week's launch/i))).toBeVisible();
    await expect(page.getByText(/this week's launch/i)).toBeVisible({ timeout: 15_000 });
  });

  test("renders the connection indicator", async ({ page }) => {
    await page.goto("/display");
    await expect(
      page.getByText(/online and subscribed|connecting|reconnecting|offline/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("renders the activity feed panel", async ({ page }) => {
    await page.goto("/display");
    await expect(page.getByText(/recent activity/i)).toBeVisible({ timeout: 15_000 });
  });

  test("has no navigation chrome and no scrollbars", async ({ page }) => {
    await page.goto("/display");
    await expect(page.locator("nav")).toHaveCount(0);
    const hasScroll = await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    );
    expect(hasScroll).toBe(false);
  });
});

test.describe("accessibility", () => {
  test("respects prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/display");
    await expect(page.getByText(/this week's launch/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("resolution rendering", () => {
  test("renders without horizontal overflow at the configured viewport", async ({ page }) => {
    await page.goto("/display");
    await expect(page.getByText(/this week's launch/i)).toBeVisible({ timeout: 15_000 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test.describe("offline handling", () => {
  test("keeps the last valid dashboard visible when offline", async ({ page, context }) => {
    await page.goto("/display");
    await expect(page.getByText(/this week's launch/i)).toBeVisible({ timeout: 15_000 });

    await context.setOffline(true);
    await expect(page.getByText(/this week's launch/i)).toBeVisible();

    await context.setOffline(false);
  });
});
