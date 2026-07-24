"use client";

import { useCallback, useRef, useState } from "react";
import type { PublicMergeEvent } from "@/lib/types";

const STORAGE_KEY = "merge-arena-celebrated-ids";
const MAX_QUEUE_SIZE = 10;

export type CelebrationEntry =
  | { kind: "merge"; event: PublicMergeEvent; goalReached: boolean }
  | { kind: "summary"; count: number };

function readCelebratedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistCelebratedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // sessionStorage unavailable; celebration dedupe degrades gracefully
  }
}

export function useCelebrationQueue() {
  const [queue, setQueue] = useState<CelebrationEntry[]>([]);
  const celebratedIds = useRef<Set<string>>(readCelebratedIds());
  const initialLoadComplete = useRef(false);

  const markInitialLoadComplete = useCallback(() => {
    initialLoadComplete.current = true;
  }, []);

  const enqueue = useCallback((event: PublicMergeEvent, goalReached: boolean) => {
    if (!initialLoadComplete.current) return false;
    if (celebratedIds.current.has(event.id)) return false;

    let added = false;

    setQueue((current) => {
      if (current.length >= MAX_QUEUE_SIZE) return current;
      added = true;
      return [...current, { kind: "merge", event, goalReached }];
    });

    if (added) {
      celebratedIds.current.add(event.id);
      persistCelebratedIds(celebratedIds.current);
    }

    return added;
  }, []);

  const enqueueSummary = useCallback((count: number) => {
    setQueue((current) => [...current, { kind: "summary", count }]);
  }, []);

  const advance = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  return {
    queue,
    current: queue[0] ?? null,
    enqueue,
    enqueueSummary,
    advance,
    markInitialLoadComplete,
    queueSize: queue.length,
    maxQueueSize: MAX_QUEUE_SIZE,
  };
}
