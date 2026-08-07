export function MemberScoreboard({ totalMerges }: { totalMerges: number }) {
  return (
    <div className="flex flex-col justify-center rounded-[1.5rem] bg-moss p-[1.375rem] text-center">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-sage-deep">
        Merges this week
      </p>
      <p className="mt-[0.375rem] font-display text-[3.5rem] font-bold tabular-nums leading-none text-leaf">
        {totalMerges}
      </p>
    </div>
  );
}
