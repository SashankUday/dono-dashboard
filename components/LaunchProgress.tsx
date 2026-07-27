import type { PublicMergeEvent } from "@/lib/types";
import { formatRelativeTime } from "@/lib/time";

export function LaunchProgress({ latestMerge }: { latestMerge: PublicMergeEvent | undefined }) {
  const mergedAt = latestMerge ? new Date(latestMerge.mergedAt) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-400/25 via-white/10 to-sky-400/15 p-8 ring-1 ring-white/15 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.3em] text-white/55">Latest merge</p>
      {latestMerge && mergedAt ? (
        <div className="mt-8">
          <div className="flex items-center gap-4">
            {latestMerge.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latestMerge.authorAvatarUrl} alt="" aria-hidden className="h-16 w-16 rounded-full" />
            ) : (
              <span className="h-16 w-16 rounded-full bg-white/15" aria-hidden />
            )}
            <div>
              <p className="text-2xl font-semibold">{latestMerge.authorDisplayName}</p>
              <p className="text-white/60">merged {formatRelativeTime(mergedAt, new Date())}</p>
            </div>
          </div>
          <p className="mt-7 text-4xl font-semibold leading-tight tracking-tight">{latestMerge.publicTitle}</p>
          <p className="mt-4 text-lg text-white/60">{latestMerge.repositoryDisplayName} #{latestMerge.pullRequestNumber}</p>
        </div>
      ) : (
        <p className="my-auto text-2xl text-white/60">Waiting for the first merge.</p>
      )}
    </div>
  );
}
