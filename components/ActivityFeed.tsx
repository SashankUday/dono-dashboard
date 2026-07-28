"use client";

import { useEffect, useState } from "react";
import type { PublicMergeEvent } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";

export function ActivityFeed({ events }: { events: PublicMergeEvent[] }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col rounded-3xl bg-white/5 p-6 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.25em] text-white/40">Recent activity</p>
      <ul className="mt-4 flex-1 space-y-4 overflow-hidden">
        {events.length === 0 ? (
          <li className="text-white/40">Nothing shipped yet — this is where it&rsquo;ll show up.</li>
        ) : (
          events.slice(0, 10).map((event) => (
            <li key={event.id} className="flex items-center gap-3">
              {event.authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.authorAvatarUrl}
                  alt=""
                  aria-hidden
                  className="h-10 w-10 flex-shrink-0 rounded-full"
                />
              ) : (
                <span className="h-10 w-10 flex-shrink-0 rounded-full bg-white/10" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">
                  <span className="font-medium">{event.authorDisplayName}</span>{" "}
                  <span className="text-white/60">shipped {event.publicTitle}</span>
                </p>
                <p className="truncate text-sm text-white/40">
                  {event.repositoryDisplayName}
                  {event.pullRequestNumber ? ` #${event.pullRequestNumber}` : ""} ·{" "}
                  {formatRelativeTime(new Date(event.mergedAt), now)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
