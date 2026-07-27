"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { mergeArenaConfig } from "@/config/merge-arena";
import type { DashboardResponse } from "@/lib/types";

const MAX_BACKOFF_MS = 60 * 1000;
export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";

export function useDashboardData() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<Date | null>(null);

  const backoffMs = useRef(1000);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching = useRef(false);
  const fetchDashboardRef = useRef<() => Promise<DashboardResponse | null>>(async () => null);

  const fetchDashboard = useCallback(async (): Promise<DashboardResponse | null> => {
    if (isFetching.current) return null;
    isFetching.current = true;
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Dashboard fetch failed with status ${response.status}`);
      }

      const payload = (await response.json()) as DashboardResponse;
      const generatedAt = new Date(payload.generatedAt);

      if (Number.isNaN(generatedAt.valueOf())) {
        throw new Error("Dashboard response has an invalid generatedAt timestamp");
      }

      setData(payload);
      setStatus("online");
      setLastSuccessfulSyncAt(generatedAt);
      backoffMs.current = 1000;

      return payload;
    } catch (error) {
      console.error("dashboard_fetch_failed", error);
      setStatus((current) => (current === "connecting" ? "offline" : "reconnecting"));

      return null;
    } finally {
      isFetching.current = false;
    }
  }, []);

  useLayoutEffect(() => {
    fetchDashboardRef.current = fetchDashboard;
  });

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const result = await fetchDashboardRef.current();
      if (cancelled) return;
      const delay = result ? mergeArenaConfig.pollingIntervalMs : backoffMs.current;
      if (!result) backoffMs.current = Math.min(backoffMs.current * 2, MAX_BACKOFF_MS);
      timer.current = setTimeout(poll, delay);
    };
    void poll();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { data, status, lastSuccessfulSyncAt, refetch: fetchDashboard };
}
