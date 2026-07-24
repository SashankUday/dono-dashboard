"use client";

import { useEffect, useRef } from "react";
import { ScreenShell } from "@/components/ScreenShell";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { LaunchProgress } from "@/components/LaunchProgress";
import { MemberScoreboard } from "@/components/MemberScoreboard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCelebrationQueue } from "@/hooks/useCelebrationQueue";
import { useMergeRealtime, type ConnectionStatus } from "@/hooks/useMergeRealtime";
import { getWeekStartKey } from "@/lib/time";
import type { MergeEventRow } from "@/lib/github/realtime-schema";

const GOAL_MARKER_PREFIX = "merge-arena-goal-reached-";

function hasShownGoalCelebration(weekStartKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GOAL_MARKER_PREFIX + weekStartKey) === "1";
  } catch {
    return true;
  }
}

function markGoalCelebrationShown(weekStartKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOAL_MARKER_PREFIX + weekStartKey, "1");
  } catch {
    // localStorage unavailable; goal celebration may repeat across sessions
  }
}

export default function DisplayPage() {
  const { data, status: fetchStatus, lastSuccessfulSyncAt, refetch } = useDashboardData();
  const celebration = useCelebrationQueue();
  const lastSeenMergedAt = useRef<string | null>(null);
  const previousConnectionStatus = useRef<ConnectionStatus>("connecting");

  useEffect(() => {
    if (data && lastSeenMergedAt.current === null) {
      lastSeenMergedAt.current = data.recentMerges[0]?.mergedAt ?? new Date(0).toISOString();
      celebration.markInitialLoadComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleInsert = async (row: MergeEventRow) => {
    const fresh = await refetch();
    if (!fresh) return;

    const matched = fresh.recentMerges.find((event) => event.id === row.id);
    if (!matched) return;

    lastSeenMergedAt.current = matched.mergedAt;

    const weekStartKey = getWeekStartKey(new Date());
    const goalReachedNow = fresh.week.goalReached && !hasShownGoalCelebration(weekStartKey);

    const added = celebration.enqueue(matched, goalReachedNow);
    if (added && goalReachedNow) {
      markGoalCelebrationShown(weekStartKey);
    }
  };

  const { status: connectionStatus } = useMergeRealtime(handleInsert);

  useEffect(() => {
    const wasDown =
      previousConnectionStatus.current === "reconnecting" || previousConnectionStatus.current === "offline";

    if (wasDown && connectionStatus === "online") {
      void (async () => {
        const fresh = await refetch();
        if (!fresh) return;

        const missed = lastSeenMergedAt.current
          ? fresh.recentMerges.filter((event) => event.mergedAt > lastSeenMergedAt.current!)
          : [];

        if (missed.length > celebration.maxQueueSize) {
          celebration.enqueueSummary(missed.length);
        } else {
          for (const event of missed.slice().reverse()) {
            celebration.enqueue(event, false);
          }
        }

        lastSeenMergedAt.current = fresh.recentMerges[0]?.mergedAt ?? lastSeenMergedAt.current;
      })();
    }

    previousConnectionStatus.current = connectionStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  if (!data) {
    return (
      <ScreenShell>
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white/70" />
          <p className="text-2xl text-white/70">
            {fetchStatus === "error" ? "Reconnecting to merge feed" : "Connecting to merge feed"}
          </p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">{data.settings.teamName}</h1>
        <ConnectionIndicator status={connectionStatus} lastSuccessfulSyncAt={lastSuccessfulSyncAt} />
      </header>

      <main className="mt-8 grid flex-1 grid-cols-3 gap-6 overflow-hidden">
        <div className="col-span-2 flex flex-col gap-6">
          <LaunchProgress week={data.week} teamName={data.settings.teamName} weeklyGoal={data.settings.weeklyGoal} />
          <MemberScoreboard members={data.members} />
        </div>
        <div className="col-span-1 overflow-hidden">
          <ActivityFeed events={data.recentMerges} />
        </div>
      </main>

      {celebration.current ? (
        <CelebrationOverlay
          entry={celebration.current}
          celebrationSeconds={data.settings.celebrationSeconds}
          week={data.week}
          weeklyGoal={data.settings.weeklyGoal}
          onComplete={celebration.advance}
        />
      ) : null}
    </ScreenShell>
  );
}
