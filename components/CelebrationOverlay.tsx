"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CelebrationEntry } from "@/hooks/useCelebrationQueue";
import type { DashboardResponse } from "@/lib/types";

export function CelebrationOverlay({
  entry,
  celebrationSeconds,
  week,
  weeklyGoal,
  onComplete,
}: {
  entry: CelebrationEntry;
  celebrationSeconds: number;
  week: DashboardResponse["week"];
  weeklyGoal: number;
  onComplete: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [showGoalReached, setShowGoalReached] = useState(false);

  useEffect(() => {
    if (entry.kind === "merge" && entry.goalReached) {
      const goalTimer = setTimeout(() => setShowGoalReached(true), celebrationSeconds * 1000);
      const completeTimer = setTimeout(onComplete, celebrationSeconds * 1000 + 4000);
      return () => {
        clearTimeout(goalTimer);
        clearTimeout(completeTimer);
      };
    }

    const completeTimer = setTimeout(onComplete, celebrationSeconds * 1000);
    return () => clearTimeout(completeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const fadeOnly = reducedMotion ?? false;

  const enter = (delaySeconds: number) =>
    fadeOnly
      ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: delaySeconds } } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0, transition: { delay: delaySeconds, duration: 0.5 } },
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060a]/95 p-[5%] text-white backdrop-blur">
      <AnimatePresence mode="wait">
        {showGoalReached ? (
          <motion.div
            key="goal-reached"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-2xl uppercase tracking-[0.4em] text-emerald-300">Weekly goal reached</p>
            <p className="mt-6 text-6xl font-semibold">The team shipped it 🎉</p>
          </motion.div>
        ) : entry.kind === "summary" ? (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-4xl font-semibold">
              The team shipped {entry.count}+ changes while this screen was offline.
            </p>
          </motion.div>
        ) : (
          <motion.div key={entry.event.id} className="w-full max-w-4xl text-center">
            <motion.div {...enter(0)} className="mx-auto flex justify-center">
              {entry.event.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.event.authorAvatarUrl}
                  alt=""
                  aria-hidden
                  className="h-32 w-32 rounded-full ring-4 ring-white/20"
                />
              ) : (
                <span className="h-32 w-32 rounded-full bg-white/10" aria-hidden />
              )}
            </motion.div>

            <motion.h2 {...enter(0.5)} className="mt-6 text-5xl font-semibold">
              {entry.event.authorDisplayName} has shipped
            </motion.h2>

            <motion.div {...enter(1.5)} className="mt-6">
              <p className="text-3xl text-white/90">{entry.event.publicTitle}</p>
              <p className="mt-2 text-xl text-white/50">
                {entry.event.repositoryDisplayName}
                {entry.event.pullRequestNumber ? ` #${entry.event.pullRequestNumber}` : ""}
              </p>
              {entry.event.mergedByGithubLogin &&
              entry.event.mergedByGithubLogin !== entry.event.authorGithubLogin ? (
                <p className="mt-1 text-lg text-white/40">Merged by {entry.event.mergedByGithubLogin}</p>
              ) : null}
            </motion.div>

            <motion.div {...enter(6.5)} className="mt-10">
              <p className="text-lg text-white/50">
                {week.totalMerges} / {weeklyGoal} this week
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
