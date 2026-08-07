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
  const { audioEnabled, audioElement, enableAudio, disableAudio, playMergeSound } = useMergeAudio();
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
        <div className="flex h-full flex-col items-center justify-center gap-[1.5rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dino.svg"
            alt=""
            aria-hidden
            data-motion
            className="w-[10rem]"
            style={{ animation: "dino-bounce 1.6s ease-in-out infinite" }}
          />
          <p className="font-display text-[1.5rem] font-semibold text-forest">
            {connectionStatus === "offline" ? "Reconnecting to merge feed" : "Connecting to merge feed"}
          </p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[0.75rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dino.svg" alt="" aria-hidden className="w-[3.5rem]" />
          <h1 className="font-display text-[1.625rem] font-bold text-forest">
            {data.settings.teamName}
          </h1>
        </div>
        <div className="flex items-center gap-[0.625rem]">
          <ConnectionIndicator status={connectionStatus} lastSuccessfulSyncAt={lastSuccessfulSyncAt} />
          <button
            type="button"
            onClick={() => void (audioEnabled ? disableAudio() : enableAudio())}
            className="rounded-full border border-sand bg-white px-[0.875rem] py-[0.4375rem] text-[0.75rem] font-semibold text-ink transition hover:bg-cream"
          >
            {audioEnabled ? "Mute sound" : "Enable sound"}
          </button>
        </div>
      </header>

      <LaunchProgress latestMerge={data.recentMerges[0]} />

      <main className="mt-[1.125rem] grid min-h-0 flex-1 grid-cols-[17.5rem_1fr] gap-[1.125rem]">
        <MemberScoreboard totalMerges={data.week.totalMerges} />
        <div className="min-h-0 overflow-hidden">
          <ActivityFeed events={data.recentMerges} />
        </div>
      </main>

      <audio ref={audioElement} preload="auto" aria-hidden />

      {currentCelebration ? (
        <CelebrationOverlay
          entry={currentCelebration}
          celebrationSeconds={data.settings.celebrationSeconds}
          onComplete={celebration.advance}
        />
      ) : null}
    </ScreenShell>
  );
}
