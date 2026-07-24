import type { PullRequestWebhookPayload } from "./payload-schema";

export type PrivacyMode = "full" | "number_only" | "generic";

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

export function transformMergeEvent(args: {
  deliveryId: string;
  payload: PullRequestWebhookPayload;
  privacyMode: PrivacyMode;
  botLogins: Set<string>;
}): Record<string, unknown> {
  const { deliveryId, payload, privacyMode, botLogins } = args;
  const pr = payload.pull_request;
  const repo = payload.repository;

  const authorIsBot = isBotUser(pr.user, botLogins);
  const mergedByIsBot = pr.merged_by ? isBotUser(pr.merged_by, botLogins) : false;

  const title = publicTitle({
    mode: privacyMode,
    title: pr.title,
    number: pr.number,
  });

  return {
    github_delivery_id: deliveryId,
    github_repository_id: repo.id,
    repository_full_name: repo.full_name,
    repository_display_name: repo.name,
    repository_is_private: repo.private,
    privacy_mode: privacyMode,
    author_github_user_id: pr.user.id,
    author_github_login: pr.user.login,
    author_avatar_url: pr.user.avatar_url ?? null,
    author_is_bot: authorIsBot,
    merged_by_github_user_id: pr.merged_by ? pr.merged_by.id : "",
    merged_by_github_login: pr.merged_by ? pr.merged_by.login : "",
    merged_by_avatar_url: pr.merged_by ? (pr.merged_by.avatar_url ?? null) : null,
    merged_by_is_bot: mergedByIsBot,
    github_pull_request_id: pr.id,
    pull_request_number: pr.number,
    pull_request_title: privacyMode === "generic" ? null : pr.title,
    public_title: title,
    pull_request_url: pr.html_url,
    base_branch: pr.base.ref,
    head_branch: pr.head.ref,
    additions: pr.additions ?? "",
    deletions: pr.deletions ?? "",
    changed_files: pr.changed_files ?? "",
    github_created_at: pr.created_at,
    merged_at: pr.merged_at,
    is_visible: !authorIsBot,
  };
}
