"use client";

import { useEffect, useState } from "react";
import type { PublicMergeEvent } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

export function ActivityFeed({ events }: { events: PublicMergeEvent[] }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] bg-white p-[1.25rem]">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-sage">
        Recent activity
      </p>
      {/* The panel shows as many rows as fit; the mask keeps a clipped row from
          ending on a hard edge. */}
      <ul className="mt-[0.625rem] min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%-2.5rem),transparent)]">
        {events.length === 0 ? (
          <li className="py-[0.5625rem] text-[0.8125rem] text-ink-muted">
            Nothing shipped yet — this is where it&rsquo;ll show up.
          </li>
        ) : (
          events.slice(0, 10).map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-[0.625rem] border-b border-sand-line py-[0.5625rem] last:border-b-0"
            >
              <Avatar
                src={event.authorAvatarUrl}
                name={event.authorDisplayName}
                tone="soft"
                className="h-[2rem] w-[2rem] text-[0.6875rem] font-bold"
              />
              <div className="min-w-0">
                <p className="truncate text-[0.8125rem] text-ink">
                  <b className="font-bold">{event.authorDisplayName}</b> shipped {event.publicTitle}
                </p>
                <p className="text-[0.6875rem] text-ink-muted">
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
