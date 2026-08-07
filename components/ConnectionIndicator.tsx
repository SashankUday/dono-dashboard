import type { ConnectionStatus } from "@/hooks/useDashboardData";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting to merge feed",
  online: "Online and polling",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

const DOT_COLORS: Record<ConnectionStatus, string> = {
  connecting: "bg-signal-warn",
  online: "bg-leaf",
  reconnecting: "bg-signal-warn",
  offline: "bg-signal-down",
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
    <div className="flex items-center gap-[0.375rem] rounded-full bg-mist px-[0.75rem] py-[0.4375rem] text-[0.75rem] font-semibold text-forest">
      <span
        className={`inline-block h-[0.4375rem] w-[0.4375rem] rounded-full ${DOT_COLORS[status]} ${
          status !== "online" ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      <span>{LABELS[status]}</span>
      {syncLabel ? (
        <span className="font-medium text-sage-deep">· Last updated {syncLabel}</span>
      ) : null}
    </div>
  );
}
