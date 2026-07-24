create extension if not exists pgcrypto;
create extension if not exists citext;

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  github_repository_id bigint not null unique,
  full_name citext not null unique,
  display_name text not null,
  is_enabled boolean not null default true,
  is_private boolean not null default true,
  privacy_mode text not null default 'number_only'
    check (privacy_mode in ('full', 'number_only', 'generic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  github_user_id bigint not null unique,
  github_login citext not null unique,
  display_name text,
  avatar_url text,
  is_active boolean not null default false,
  is_bot boolean not null default false,
  celebration_style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merge_events (
  id uuid primary key default gen_random_uuid(),
  github_delivery_id text not null unique,
  github_pull_request_id bigint not null unique,
  repository_id uuid not null references public.repositories(id),
  pull_request_number integer not null check (pull_request_number > 0),
  pull_request_title text,
  public_title text not null,
  pull_request_url text,
  author_member_id uuid not null references public.team_members(id),
  merged_by_member_id uuid references public.team_members(id),
  author_github_login citext not null,
  author_avatar_url text,
  merged_by_github_login citext,
  base_branch text,
  head_branch text,
  additions integer check (additions is null or additions >= 0),
  deletions integer check (deletions is null or deletions >= 0),
  changed_files integer check (changed_files is null or changed_files >= 0),
  github_created_at timestamptz,
  merged_at timestamptz not null,
  is_visible boolean not null default true,
  received_at timestamptz not null default now(),
  unique (repository_id, pull_request_number)
);

create table public.dashboard_settings (
  id boolean primary key default true check (id = true),
  team_name text not null default 'Engineering',
  weekly_goal integer not null default 10 check (weekly_goal > 0),
  timezone text not null default 'Europe/London',
  celebration_seconds integer not null default 8
    check (celebration_seconds between 3 and 30),
  feed_size integer not null default 10
    check (feed_size between 5 and 50),
  sound_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.dashboard_settings (id)
values (true)
on conflict (id) do nothing;

create index merge_events_merged_at_idx
  on public.merge_events (merged_at desc);

create index merge_events_author_merged_at_idx
  on public.merge_events (author_member_id, merged_at desc);

create index merge_events_repository_merged_at_idx
  on public.merge_events (repository_id, merged_at desc);

alter table public.repositories enable row level security;
alter table public.team_members enable row level security;
alter table public.merge_events enable row level security;
alter table public.dashboard_settings enable row level security;

grant select on public.repositories to anon, authenticated;
grant select on public.team_members to anon, authenticated;
grant select on public.merge_events to anon, authenticated;
grant select on public.dashboard_settings to anon, authenticated;

create policy "Display can read enabled repositories"
on public.repositories
for select
to anon, authenticated
using (is_enabled = true);

create policy "Display can read team members"
on public.team_members
for select
to anon, authenticated
using (true);

create policy "Display can read visible merge events"
on public.merge_events
for select
to anon, authenticated
using (is_visible = true);

create policy "Display can read settings"
on public.dashboard_settings
for select
to anon, authenticated
using (id = true);

alter publication supabase_realtime
add table public.merge_events;
