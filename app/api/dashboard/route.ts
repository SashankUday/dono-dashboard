import { NextResponse } from "next/server";
import { mergeArenaConfig } from "@/config/merge-arena";
import { aggregateDashboard } from "@/lib/dashboard/aggregate";
import { GitHubApiError } from "@/lib/github/client";
import { fetchRecentContributions } from "@/lib/github/fetch-recent-contributions";
import type { DashboardResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cachedDashboard: { response: DashboardResponse; expiresAt: number } | null = null;
let inFlightDashboard: Promise<DashboardResponse> | null = null;

async function loadDashboard(): Promise<DashboardResponse> {
  const now = Date.now();
  if (cachedDashboard && cachedDashboard.expiresAt > now) return cachedDashboard.response;

  if (!inFlightDashboard) {
    inFlightDashboard = (async () => {
      const queryStartedAt = new Date();
      const events = await fetchRecentContributions(queryStartedAt);
      const response = aggregateDashboard(events, new Date());
      console.info("dashboard_events_loaded", { eventCount: events.length, generatedAt: response.generatedAt });
      cachedDashboard = { response, expiresAt: Date.now() + mergeArenaConfig.githubCacheMs };
      return response;
    })().finally(() => {
      inFlightDashboard = null;
    });
  }

  return inFlightDashboard;
}

export async function GET() {
  try {
    const response = await loadDashboard();
    console.info("dashboard_events_retrieved", { eventCount: response.recentMerges.length, generatedAt: response.generatedAt });
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      console.error("github_dashboard_fetch_failed", { status: error.status, rateLimited: error.rateLimited });
    } else {
      console.error("github_dashboard_fetch_failed", { error: error instanceof Error ? error.message : "unknown" });
    }
    return NextResponse.json({ error: "GitHub data is temporarily unavailable" }, { status: 502 });
  }
}
