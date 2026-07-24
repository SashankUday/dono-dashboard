import type { ConnectionStatus } from "@/hooks/useMergeRealtime";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting to merge feed",
  online: "Online and subscribed",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

const DOT_COLORS: Record<ConnectionStatus, string> = {
  connecting: "bg-amber-400",
  online: "bg-emerald-400",
  reconnecting: "bg-amber-400",
  offline: "bg-red-400",
};

export function ConnectionIndicator({
  status,
  lastSuccessfulSyncAt,
}: {
  status: ConnectionStatus;
  lastSuccessfulSyncAt: Date | null;
}) {
  const syncLabel = lastSuccessfulSyncAt
    ? lastSuccessfulSyncAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      })
    : null;

  return (
    <div className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full ${DOT_COLORS[status]} ${status !== "online" ? "animate-pulse" : ""}`}
        aria-hidden
      />
      <span>{LABELS[status]}</span>
      {syncLabel ? <span className="text-white/40">Last updated {syncLabel}</span> : null}
    </div>
  );
}
