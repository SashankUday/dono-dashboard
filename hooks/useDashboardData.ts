"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DashboardResponse } from "@/lib/types";

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const MAX_BACKOFF_MS = 60 * 1000;
const HARD_RELOAD_AFTER_MS = 30 * 60 * 1000;

export type DashboardFetchStatus = "loading" | "ready" | "error";

export function useDashboardData() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<DashboardFetchStatus>("loading");
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState<Date | null>(null);

  const failureStreakStartedAt = useRef<number | null>(null);
  const backoffMs = useRef(1000);
  const reconcileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDashboardRef = useRef<() => Promise<DashboardResponse | null>>(async () => null);

  const fetchDashboard = useCallback(async (): Promise<DashboardResponse | null> => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Dashboard fetch failed with status ${response.status}`);
      }

      const payload = (await response.json()) as DashboardResponse;

      setData(payload);
      setStatus("ready");
      setLastSuccessfulSyncAt(new Date());
      failureStreakStartedAt.current = null;
      backoffMs.current = 1000;

      return payload;
    } catch (error) {
      console.error("dashboard_fetch_failed", error);
      setStatus((current) => (current === "loading" ? "error" : current === "ready" ? "error" : current));

      if (failureStreakStartedAt.current === null) {
        failureStreakStartedAt.current = Date.now();
      } else if (Date.now() - failureStreakStartedAt.current > HARD_RELOAD_AFTER_MS) {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }

      retryTimer.current = setTimeout(() => {
        backoffMs.current = Math.min(backoffMs.current * 2, MAX_BACKOFF_MS);
        void fetchDashboardRef.current();
      }, backoffMs.current);

      return null;
    }
  }, []);

  useLayoutEffect(() => {
    fetchDashboardRef.current = fetchDashboard;
  });

  useEffect(() => {
    void fetchDashboardRef.current();

    reconcileTimer.current = setInterval(() => {
      void fetchDashboardRef.current();
    }, RECONCILIATION_INTERVAL_MS);

    return () => {
      if (reconcileTimer.current) clearInterval(reconcileTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  return { data, status, lastSuccessfulSyncAt, refetch: fetchDashboard };
}
