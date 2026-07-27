export function MemberScoreboard({ totalMerges }: { totalMerges: number }) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.25em] text-white/40">Informal team activity</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-5xl font-semibold tabular-nums">{totalMerges}</span>
        <span className="text-lg text-white/60">merges this week</span>
      </div>
    </div>
  );
}
