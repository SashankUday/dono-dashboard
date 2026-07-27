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
import { useMergeAudio } from "@/hooks/useMergeAudio";
import { getWeekStartKey } from "@/lib/time";
import { mergeArenaConfig } from "@/config/merge-arena";

const GOAL_MARKER_PREFIX = "merge-arena-goal-reached-";
const LAST_SEEN_EVENT_KEY = "merge-arena:last-seen-event";

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

function persistLastSeenEvent(eventId: string, mergedAt: string) {
  try {
    window.localStorage.setItem(LAST_SEEN_EVENT_KEY, JSON.stringify({ eventId, mergedAt }));
  } catch {
    // localStorage unavailable; the current page still deduplicates events.
  }
}

function getMergeSoundFile(githubLogin: string): string | undefined {
  const member = Object.entries(mergeArenaConfig.members).find(
    ([login]) => login.toLowerCase() === githubLogin.toLowerCase(),
  );
  return member?.[1].mergeSoundFile;
}

export default function DisplayPage() {
  const { data, status: connectionStatus, lastSuccessfulSyncAt } = useDashboardData();
  const celebration = useCelebrationQueue();
  const initialLoadComplete = useRef(false);
  const seenEventIds = useRef(new Set<string>());
  const { audioEnabled, isFullscreen, enableAudio, disableAudio, exitFullscreen, playMergeSound } = useMergeAudio();
  const currentCelebration = celebration.current;

  useEffect(() => {
    if (!data) return;

    if (!initialLoadComplete.current) {
      for (const event of data.recentMerges) seenEventIds.current.add(event.id);
      celebration.markInitialLoadComplete();
      initialLoadComplete.current = true;
      return;
    }
    const unseen = data.recentMerges
      .filter((event) => !seenEventIds.current.has(event.id))
      .sort((a, b) => new Date(a.mergedAt).valueOf() - new Date(b.mergedAt).valueOf());
    for (const event of unseen) seenEventIds.current.add(event.id);

    if (unseen.length > celebration.maxQueueSize) {
      celebration.enqueueSummary(unseen.length);
    } else {
      let goalCelebrationAvailable = data.week.goalReached && !hasShownGoalCelebration(getWeekStartKey(new Date()));
      for (const event of unseen) {
        const added = celebration.enqueue(event, goalCelebrationAvailable);
        if (added && goalCelebrationAvailable) {
          markGoalCelebrationShown(getWeekStartKey(new Date()));
          goalCelebrationAvailable = false;
        }
      }
    }

    const newest = data.recentMerges[0];
    if (newest) persistLastSeenEvent(newest.id, newest.mergedAt);
  }, [data, celebration]);

  useEffect(() => {
    if (currentCelebration?.kind === "merge") {
      playMergeSound(getMergeSoundFile(currentCelebration.event.authorGithubLogin));
    }
  }, [currentCelebration, playMergeSound]);

  if (!data) {
    return (
      <ScreenShell>
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white/70" />
          <p className="text-2xl text-white/70">
            {connectionStatus === "offline" ? "Reconnecting to merge feed" : "Connecting to merge feed"}
          </p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">{data.settings.teamName}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void (audioEnabled ? disableAudio() : enableAudio())}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20"
          >
            {audioEnabled ? "Mute celebrations" : "Start Merge Arena"}
          </button>
          {isFullscreen ? (
            <button
              type="button"
              onClick={() => void exitFullscreen()}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/20"
            >
              Exit full screen
            </button>
          ) : null}
          <ConnectionIndicator status={connectionStatus} lastSuccessfulSyncAt={lastSuccessfulSyncAt} />
        </div>
      </header>

      <main className="mt-8 grid flex-1 grid-cols-2 gap-6 overflow-hidden">
        <div className="flex min-h-0 flex-col gap-6">
          <LaunchProgress latestMerge={data.recentMerges[0]} />
          <MemberScoreboard totalMerges={data.week.totalMerges} />
        </div>
        <div className="min-h-0 overflow-hidden">
          <ActivityFeed events={data.recentMerges} />
        </div>
      </main>

      {currentCelebration ? (
        <CelebrationOverlay
          entry={currentCelebration}
          celebrationSeconds={data.settings.celebrationSeconds}
          week={data.week}
          weeklyGoal={data.settings.weeklyGoal}
          onComplete={celebration.advance}
        />
      ) : null}
    </ScreenShell>
  );
}
