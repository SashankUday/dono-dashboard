"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CelebrationEntry } from "@/hooks/useCelebrationQueue";
import { Avatar } from "@/components/Avatar";

const TRIANGLE = "polygon(50% 0, 100% 100%, 0 100%)";
const CONFETTI_COUNT = 30;

/**
 * A fixed, seeded field of confetti. Deterministic so the server and client
 * render the same markup, varied so the pieces never read as a repeating row.
 * Every delay is negative, which means the overlay opens mid-shower instead of
 * with an empty band at the top.
 */
const CONFETTI = (() => {
  let seed = 20260807;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    left: `${(index + random()) * (100 / CONFETTI_COUNT)}%`,
    size: `${(0.5 + random() * 0.5).toFixed(3)}rem`,
    color: random() > 0.5 ? "#e98aa3" : "#2b7b54",
    duration: `${(2.6 + random() * 2.4).toFixed(2)}s`,
    delay: `${(-random() * 5).toFixed(2)}s`,
    spin: `${Math.round((random() > 0.5 ? 1 : -1) * (360 + random() * 420))}deg`,
    drift: `${((random() - 0.5) * 10).toFixed(2)}rem`,
  }));
})();
const BOUNCE = { animation: "dino-bounce 1.6s ease-in-out infinite" };

/** The pink marker-pen stroke sitting behind the headline. */
function Highlight() {
  return (
    <span
      aria-hidden
      className="absolute inset-x-[6%] bottom-[-0.375rem] z-0 h-[0.625rem] -rotate-1 rounded-[0.375rem] bg-blossom opacity-[0.55]"
    />
  );
}

export function CelebrationOverlay({
  entry,
  celebrationSeconds,
  onComplete,
}: {
  entry: CelebrationEntry;
  celebrationSeconds: number;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-cream-bright p-[2.25rem] text-center font-sans">
      {fadeOnly
        ? null
        : CONFETTI.map((piece, index) => (
            <span
              key={index}
              aria-hidden
              data-motion
              className="absolute top-0"
              style={
                {
                  width: piece.size,
                  height: piece.size,
                  left: piece.left,
                  background: piece.color,
                  clipPath: TRIANGLE,
                  animation: `confetti-fall ${piece.duration} ${piece.delay} linear infinite`,
                  "--confetti-drift": piece.drift,
                  "--confetti-spin": piece.spin,
                } as CSSProperties
              }
            />
          ))}

      <AnimatePresence mode="wait">
        {showGoalReached ? (
          <motion.div
            key="goal-reached"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <p className="text-[0.875rem] font-bold uppercase tracking-[0.2em] text-sage-deep">
              Weekly goal reached
            </p>
            <span className="relative mt-[1.25rem] inline-block">
              <span className="relative z-[1] font-display text-[3rem] font-bold text-forest">
                The team shipped it 🎉
              </span>
              <Highlight />
            </span>
          </motion.div>
        ) : entry.kind === "summary" ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/dino.svg"
              alt=""
              aria-hidden
              data-motion
              className="mx-auto w-[13rem]"
              style={fadeOnly ? undefined : BOUNCE}
            />
            <p className="mt-[1.25rem] max-w-[46rem] font-display text-[2.375rem] font-semibold leading-[1.25] text-forest">
              The team shipped {entry.count}+ changes while this screen was offline.
            </p>
          </motion.div>
        ) : (
          <motion.div key={entry.event.id} className="relative z-10 w-full max-w-[52rem]">
            <motion.div {...enter(0)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dino.svg"
                alt=""
                aria-hidden
                data-motion
                className="mx-auto w-[16.25rem]"
                style={fadeOnly ? undefined : BOUNCE}
              />
            </motion.div>

            <motion.h2
              {...enter(0.5)}
              className="mt-[0.375rem] flex items-center justify-center gap-[0.75rem] font-display text-[2rem] font-bold text-forest"
            >
              <Avatar
                src={entry.event.authorAvatarUrl}
                name={entry.event.authorDisplayName}
                tone="solid"
                className="h-[3.5rem] w-[3.5rem] text-[1.125rem] font-semibold"
              />
              {entry.event.authorDisplayName} has shipped
            </motion.h2>

            <motion.div {...enter(1.5)} className="mt-[1.25rem]">
              <span className="relative inline-block">
                <span className="relative z-[1] font-display text-[2.375rem] font-semibold leading-[1.25] text-forest">
                  {entry.event.publicTitle}
                </span>
                <Highlight />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
