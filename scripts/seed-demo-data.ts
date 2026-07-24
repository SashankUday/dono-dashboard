import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const DEMO_REPOSITORY = {
  github_repository_id: 900000001,
  full_name: "acme-demo/merge-arena-demo",
  display_name: "merge-arena-demo",
};

const DEMO_MEMBERS = [
  { github_user_id: 900000101, github_login: "demo-alex", display_name: "Alex (Demo)" },
  { github_user_id: 900000102, github_login: "demo-priya", display_name: "Priya (Demo)" },
  { github_user_id: 900000103, github_login: "demo-sam", display_name: "Sam (Demo)" },
];

const DEMO_TITLES = [
  "Improve onboarding flow",
  "Fix flaky checkout test",
  "Add dark mode toggle",
  "Speed up dashboard queries",
  "Refactor auth middleware",
];

function assertNonProduction() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed demo data with NODE_ENV=production.");
    process.exit(1);
  }
}

async function main() {
  assertNonProduction();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (use a development project).");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();

  for (let i = 0; i < 8; i += 1) {
    const member = DEMO_MEMBERS[i % DEMO_MEMBERS.length];
    const mergedBy = DEMO_MEMBERS[(i + 1) % DEMO_MEMBERS.length];
    const mergedAt = new Date(now - i * 45 * 60 * 1000).toISOString();
    const prNumber = 1000 + i;

    const event = {
      github_delivery_id: `demo:${DEMO_REPOSITORY.github_repository_id}:${prNumber}`,
      github_repository_id: DEMO_REPOSITORY.github_repository_id,
      repository_full_name: DEMO_REPOSITORY.full_name,
      repository_display_name: DEMO_REPOSITORY.display_name,
      repository_is_private: true,
      privacy_mode: "full",
      author_github_user_id: member.github_user_id,
      author_github_login: member.github_login,
      author_avatar_url: null,
      author_is_bot: false,
      merged_by_github_user_id: mergedBy.github_user_id,
      merged_by_github_login: mergedBy.github_login,
      merged_by_avatar_url: null,
      merged_by_is_bot: false,
      github_pull_request_id: 900000200 + i,
      pull_request_number: prNumber,
      pull_request_title: `[DEMO] ${DEMO_TITLES[i % DEMO_TITLES.length]}`,
      public_title: `[DEMO] ${DEMO_TITLES[i % DEMO_TITLES.length]}`,
      pull_request_url: `https://github.com/${DEMO_REPOSITORY.full_name}/pull/${prNumber}`,
      base_branch: "main",
      head_branch: `${member.github_login}/demo-${i}`,
      additions: 42,
      deletions: 7,
      changed_files: 3,
      github_created_at: mergedAt,
      merged_at: mergedAt,
      is_visible: true,
    };

    const { error } = await supabase.rpc("ingest_merge_event", { p_event: event });

    if (error) {
      console.error(`Failed to seed event ${i}:`, error.message);
      process.exit(1);
    }
  }

  const { error: activateError } = await supabase
    .from("team_members")
    .update({ is_active: true })
    .in(
      "github_user_id",
      DEMO_MEMBERS.map((member) => member.github_user_id),
    );

  if (activateError) {
    console.error("Failed to activate demo members:", activateError.message);
    process.exit(1);
  }

  console.log("Seeded demo data: 1 repository, 3 members, 8 merge events.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
