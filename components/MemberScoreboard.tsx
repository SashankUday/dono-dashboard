import type { DashboardMember } from "@/lib/types";

export function MemberScoreboard({ members }: { members: DashboardMember[] }) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.25em] text-white/40">
        Informal team activity this week — not a performance ranking
      </p>
      <ul className="mt-4 space-y-3">
        {members.length === 0 ? (
          <li className="text-white/40">No merges yet this week.</li>
        ) : (
          members.map((member) => (
            <li key={member.memberId} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatarUrl}
                    alt=""
                    aria-hidden
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <span className="h-9 w-9 rounded-full bg-white/10" aria-hidden />
                )}
                <span className="text-lg font-medium">{member.displayName}</span>
              </div>
              <span className="text-lg tabular-nums text-white/60">{member.mergeCount}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
