import type { PublicMergeEvent } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

export function LaunchProgress({ latestMerge }: { latestMerge: PublicMergeEvent | undefined }) {
  const mergedAt = latestMerge ? new Date(latestMerge.mergedAt) : null;

  return (
    <section className="flex min-h-[12.4375rem] items-center justify-between gap-[1.25rem] rounded-[1.5rem] bg-white px-[1.875rem] py-[1.625rem] shadow-[0_0.375rem_1.125rem_rgba(43,123,84,0.08)]">
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-sage">Latest merge</p>

        {latestMerge && mergedAt ? (
          <>
            <div className="mt-[0.75rem] flex items-center gap-[0.75rem]">
              <Avatar
                src={latestMerge.authorAvatarUrl}
                name={latestMerge.authorDisplayName}
                tone="solid"
                className="h-[2.75rem] w-[2.75rem] font-display text-[0.9375rem] font-semibold"
              />
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-bold text-ink">
                  {latestMerge.authorDisplayName}
                </p>
                <p className="text-[0.75rem] text-ink-muted">
                  merged {formatRelativeTime(mergedAt, new Date())}
                </p>
              </div>
            </div>
            <p className="mt-[0.875rem] line-clamp-2 font-display text-[1.5rem] font-semibold leading-[1.25] text-forest">
              {latestMerge.publicTitle}
            </p>
          </>
        ) : (
          <p className="mt-[0.875rem] font-display text-[1.5rem] font-semibold leading-[1.25] text-forest">
            Waiting for the first merge.
          </p>
        )}
      </div>
    </section>
  );
}
