// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCelebrationQueue } from "@/hooks/useCelebrationQueue";
import type { PublicMergeEvent } from "@/lib/types";

function makeEvent(id: string, mergedAt: string): PublicMergeEvent {
  return {
    id,
    repositoryId: "repo-1",
    repositoryDisplayName: "widgets",
    pullRequestNumber: 1,
    publicTitle: "Pull request #1",
    pullRequestUrl: null,
    authorMemberId: "member-1",
    authorGithubLogin: "alex-dev",
    authorDisplayName: "Alex",
    authorAvatarUrl: null,
    mergedByGithubLogin: null,
    mergedAt,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("useCelebrationQueue", () => {
  it("ignores events that arrive before the initial load completes", () => {
    const { result } = renderHook(() => useCelebrationQueue());

    act(() => {
      const added = result.current.enqueue(makeEvent("evt-1", "2026-07-21T10:00:00Z"), false);
      expect(added).toBe(false);
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it("enqueues events in FIFO order after the initial load", () => {
    const { result } = renderHook(() => useCelebrationQueue());

    act(() => {
      result.current.markInitialLoadComplete();
    });

    act(() => {
      result.current.enqueue(makeEvent("evt-1", "2026-07-21T10:00:00Z"), false);
      result.current.enqueue(makeEvent("evt-2", "2026-07-21T10:05:00Z"), false);
    });

    expect(result.current.queue.map((entry) => (entry.kind === "merge" ? entry.event.id : null))).toEqual([
      "evt-1",
      "evt-2",
    ]);

    act(() => {
      result.current.advance();
    });

    expect(result.current.current && result.current.current.kind === "merge" && result.current.current.event.id).toBe(
      "evt-2",
    );
  });

  it("deduplicates an event already celebrated in this session", () => {
    const { result } = renderHook(() => useCelebrationQueue());

    act(() => {
      result.current.markInitialLoadComplete();
    });

    act(() => {
      result.current.enqueue(makeEvent("evt-1", "2026-07-21T10:00:00Z"), false);
    });

    act(() => {
      const addedAgain = result.current.enqueue(makeEvent("evt-1", "2026-07-21T10:00:00Z"), false);
      expect(addedAgain).toBe(false);
    });

    expect(result.current.queue).toHaveLength(1);
  });

  it("caps the queue at ten events", () => {
    const { result } = renderHook(() => useCelebrationQueue());

    act(() => {
      result.current.markInitialLoadComplete();
    });

    act(() => {
      for (let i = 0; i < 15; i += 1) {
        result.current.enqueue(makeEvent(`evt-${i}`, `2026-07-21T10:${String(i).padStart(2, "0")}:00Z`), false);
      }
    });

    expect(result.current.queue).toHaveLength(10);
  });
});
