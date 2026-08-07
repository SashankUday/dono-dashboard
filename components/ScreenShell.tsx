import type { ReactNode } from "react";

export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-cream font-sans text-ink">
      <div className="flex h-full w-full flex-col p-[2.25rem]">{children}</div>
    </div>
  );
}
