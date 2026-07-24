import type { DashboardResponse } from "@/lib/types";

export function LaunchProgress({
  week,
  teamName,
  weeklyGoal,
}: {
  week: DashboardResponse["week"];
  teamName: string;
  weeklyGoal: number;
}) {
  const percent = Math.round(week.goalProgress * 100);

  return (
    <div className="rounded-3xl bg-white/5 p-8 backdrop-blur">
      <p className="text-lg uppercase tracking-[0.3em] text-white/50">{teamName} · this week&rsquo;s launch</p>
      <div className="mt-4 flex items-baseline gap-4">
        <span className="text-7xl font-semibold tabular-nums">{week.totalMerges}</span>
        <span className="text-3xl text-white/50">/ {weeklyGoal} goal</span>
      </div>
      <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            week.goalReached ? "bg-emerald-400" : "bg-indigo-400"
          }`}
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
      <p className="mt-3 text-white/60">
        {week.goalReached
          ? "Weekly launch goal reached — nice work, team."
          : `${percent}% toward this week's playful team target`}
      </p>
    </div>
  );
}
