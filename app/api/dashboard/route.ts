import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getWeekRange } from "@/lib/time";
import type { DashboardMember, DashboardResponse, PublicMergeEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MergeEventRow = {
  id: string;
  repository_id: string;
  pull_request_number: number;
  public_title: string;
  pull_request_url: string | null;
  author_member_id: string;
  author_github_login: string;
  author_avatar_url: string | null;
  merged_by_github_login: string | null;
  merged_at: string;
  repository: { display_name: string } | null;
  author: { display_name: string | null; is_active: boolean; is_bot: boolean } | null;
};

export async function GET() {
  const supabase = getServerSupabase();
  const now = new Date();
  const { startsAt, endsAt } = getWeekRange(now);

  const { data: settingsRow } = await supabase
    .from("dashboard_settings")
    .select("*")
    .eq("id", true)
    .single();

  const settings = {
    teamName: settingsRow?.team_name ?? "Engineering",
    weeklyGoal: settingsRow?.weekly_goal ?? 10,
    timezone: "Europe/London" as const,
    celebrationSeconds: settingsRow?.celebration_seconds ?? 8,
    feedSize: settingsRow?.feed_size ?? 10,
    soundEnabled: settingsRow?.sound_enabled ?? false,
  };

  const { data: eventRows, error } = await supabase
    .from("merge_events")
    .select(
      `
        id,
        repository_id,
        pull_request_number,
        public_title,
        pull_request_url,
        author_member_id,
        author_github_login,
        author_avatar_url,
        merged_by_github_login,
        merged_at,
        repository:repositories!merge_events_repository_id_fkey ( display_name ),
        author:team_members!merge_events_author_member_id_fkey ( display_name, is_active, is_bot )
      `,
    )
    .eq("is_visible", true)
    .gte("merged_at", startsAt.toISOString())
    .lte("merged_at", endsAt.toISOString())
    .order("merged_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("dashboard_query_failed", { errorCode: error.code });
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }

  const rows = (eventRows ?? []) as unknown as MergeEventRow[];

  const memberCounts = new Map<string, DashboardMember>();
  let totalMerges = 0;

  for (const row of rows) {
    const author = row.author;
    if (!author) continue;
    if (author.is_bot) continue;
    if (!author.is_active) continue;

    totalMerges += 1;

    const existing = memberCounts.get(row.author_member_id);
    if (existing) {
      existing.mergeCount += 1;
    } else {
      memberCounts.set(row.author_member_id, {
        memberId: row.author_member_id,
        githubLogin: row.author_github_login,
        displayName: author.display_name ?? row.author_github_login,
        avatarUrl: row.author_avatar_url,
        mergeCount: 1,
        celebrationStyle: {},
      });
    }
  }

  const members = Array.from(memberCounts.values()).sort((a, b) => {
    if (b.mergeCount !== a.mergeCount) return b.mergeCount - a.mergeCount;
    return a.displayName.localeCompare(b.displayName);
  });

  const recentMerges: PublicMergeEvent[] = rows.slice(0, settings.feedSize).map((row) => ({
    id: row.id,
    repositoryId: row.repository_id,
    repositoryDisplayName: row.repository?.display_name ?? "Unknown repository",
    pullRequestNumber: row.pull_request_number,
    publicTitle: row.public_title,
    pullRequestUrl: row.pull_request_url,
    authorMemberId: row.author_member_id,
    authorGithubLogin: row.author_github_login,
    authorDisplayName: row.author?.display_name ?? row.author_github_login,
    authorAvatarUrl: row.author_avatar_url,
    mergedByGithubLogin: row.merged_by_github_login,
    mergedAt: row.merged_at,
  }));

  const goalProgress = settings.weeklyGoal > 0 ? Math.min(1, totalMerges / settings.weeklyGoal) : 0;

  const response: DashboardResponse = {
    generatedAt: now.toISOString(),
    settings,
    week: {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      totalMerges,
      goalProgress,
      goalReached: totalMerges >= settings.weeklyGoal,
    },
    members,
    recentMerges,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
