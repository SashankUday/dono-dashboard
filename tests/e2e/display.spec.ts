import { test, expect } from "@playwright/test";

const dashboard = {
  generatedAt: "2026-07-22T12:00:00.000Z",
  settings: { teamName: "Dono", weeklyGoal: 10, timezone: "Europe/London", celebrationSeconds: 8, feedSize: 10, soundEnabled: true },
  week: { startsAt: "2026-07-19T23:00:00.000Z", endsAt: "2026-07-26T22:59:59.999Z", totalMerges: 1, goalProgress: 0.1, goalReached: false },
  members: [{ memberId: "SashankUday", githubLogin: "SashankUday", displayName: "Sashank", avatarUrl: null, mergeCount: 1, celebrationStyle: {} }],
  recentMerges: [{ id: "github:SashankUday/dono:1", repositoryId: "SashankUday/dono", repositoryDisplayName: "Dono", pullRequestNumber: 1, publicTitle: "A change", pullRequestUrl: null, authorMemberId: "SashankUday", authorGithubLogin: "SashankUday", authorDisplayName: "Sashank", authorAvatarUrl: null, mergedByGithubLogin: null, mergedAt: "2026-07-21T10:00:00.000Z" }],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: dashboard, headers: { "Cache-Control": "private, no-store" } }));
});

test.describe("initial load", () => {
  test("shows a connecting state before data arrives, then the dashboard", async ({ page }) => {
    await page.goto("/display");
    await expect(page.getByText(/connecting to merge feed/i).or(page.getByText(/this week's launch/i))).toBeVisible();
    await expect(page.getByText(/this week's launch/i)).toBeVisible({ timeout: 15_000 });
  });

  test("renders the connection indicator", async ({ page }) => {
    await page.goto("/display");
    await expect(
      page.getByText(/online and polling|connecting|reconnecting|offline/i),
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
