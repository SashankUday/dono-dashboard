"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { browserSupabase } from "@/lib/supabase/browser";
import { mergeEventRowSchema, type MergeEventRow } from "@/lib/github/realtime-schema";

export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";

export function useMergeRealtime(onInsert: (row: MergeEventRow) => void) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const onInsertRef = useRef(onInsert);

  useLayoutEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    const channel = browserSupabase
      .channel("merge-arena-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "merge_events" },
        (payload) => {
          const parsed = mergeEventRowSchema.safeParse(payload.new);
          if (!parsed.success) return;
          if (!parsed.data.is_visible) return;
          onInsertRef.current(parsed.data);
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          setStatus("online");
        } else if (subscriptionStatus === "CHANNEL_ERROR" || subscriptionStatus === "TIMED_OUT") {
          setStatus("reconnecting");
        } else if (subscriptionStatus === "CLOSED") {
          setStatus("offline");
        }
      });

    return () => {
      void browserSupabase.removeChannel(channel);
    };
  }, []);

  return { status };
}
