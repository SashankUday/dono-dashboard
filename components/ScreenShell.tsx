import type { ReactNode } from "react";

export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05060a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.14),transparent_40%)]" />
      <div className="relative flex h-full w-full flex-col p-[5%]">{children}</div>
    </div>
  );
}
