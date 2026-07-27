import type { PrivacyMode } from "@/config/merge-arena";

export type { PrivacyMode } from "@/config/merge-arena";

export function publicTitle(args: { mode: PrivacyMode; title: string; number: number }): string {
  switch (args.mode) {
    case "full":
      return args.title;
    case "number_only":
      return `Pull request #${args.number}`;
    case "generic":
      return "A new change";
  }
}

export function isBotUser(
  user: { login: string; type?: string },
  botLogins: Set<string>,
): boolean {
  if (user.type === "Bot") return true;
  return botLogins.has(user.login.toLowerCase());
}
