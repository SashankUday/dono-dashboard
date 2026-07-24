create or replace function public.ingest_merge_event(p_event jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repository_id uuid;
  v_author_id uuid;
  v_merged_by_id uuid;
  v_event_id uuid;
begin
  insert into public.repositories (
    github_repository_id,
    full_name,
    display_name,
    is_private,
    privacy_mode
  )
  values (
    (p_event->>'github_repository_id')::bigint,
    p_event->>'repository_full_name',
    p_event->>'repository_display_name',
    coalesce((p_event->>'repository_is_private')::boolean, true),
    coalesce(p_event->>'privacy_mode', 'number_only')
  )
  on conflict (github_repository_id) do update
  set
    full_name = excluded.full_name,
    is_private = excluded.is_private,
    updated_at = now()
  returning id into v_repository_id;

  insert into public.team_members (
    github_user_id,
    github_login,
    avatar_url,
    is_active,
    is_bot
  )
  values (
    (p_event->>'author_github_user_id')::bigint,
    p_event->>'author_github_login',
    p_event->>'author_avatar_url',
    false,
    coalesce((p_event->>'author_is_bot')::boolean, false)
  )
  on conflict (github_user_id) do update
  set
    github_login = excluded.github_login,
    avatar_url = excluded.avatar_url,
    updated_at = now()
  returning id into v_author_id;

  if nullif(p_event->>'merged_by_github_user_id', '') is not null then
    insert into public.team_members (
      github_user_id,
      github_login,
      avatar_url,
      is_active,
      is_bot
    )
    values (
      (p_event->>'merged_by_github_user_id')::bigint,
      p_event->>'merged_by_github_login',
      p_event->>'merged_by_avatar_url',
      false,
      coalesce((p_event->>'merged_by_is_bot')::boolean, false)
    )
    on conflict (github_user_id) do update
    set
      github_login = excluded.github_login,
      avatar_url = excluded.avatar_url,
      updated_at = now()
    returning id into v_merged_by_id;
  end if;

  insert into public.merge_events (
    github_delivery_id,
    github_pull_request_id,
    repository_id,
    pull_request_number,
    pull_request_title,
    public_title,
    pull_request_url,
    author_member_id,
    merged_by_member_id,
    author_github_login,
    author_avatar_url,
    merged_by_github_login,
    base_branch,
    head_branch,
    additions,
    deletions,
    changed_files,
    github_created_at,
    merged_at,
    is_visible
  )
  values (
    p_event->>'github_delivery_id',
    (p_event->>'github_pull_request_id')::bigint,
    v_repository_id,
    (p_event->>'pull_request_number')::integer,
    nullif(p_event->>'pull_request_title', ''),
    p_event->>'public_title',
    nullif(p_event->>'pull_request_url', ''),
    v_author_id,
    v_merged_by_id,
    p_event->>'author_github_login',
    p_event->>'author_avatar_url',
    nullif(p_event->>'merged_by_github_login', ''),
    nullif(p_event->>'base_branch', ''),
    nullif(p_event->>'head_branch', ''),
    nullif(p_event->>'additions', '')::integer,
    nullif(p_event->>'deletions', '')::integer,
    nullif(p_event->>'changed_files', '')::integer,
    nullif(p_event->>'github_created_at', '')::timestamptz,
    (p_event->>'merged_at')::timestamptz,
    coalesce((p_event->>'is_visible')::boolean, true)
  )
  on conflict do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.merge_events
    where github_delivery_id = p_event->>'github_delivery_id'
       or (
         repository_id = v_repository_id
         and pull_request_number =
           (p_event->>'pull_request_number')::integer
       )
    limit 1;
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.ingest_merge_event(jsonb)
from public, anon, authenticated;

grant execute on function public.ingest_merge_event(jsonb)
to service_role;
