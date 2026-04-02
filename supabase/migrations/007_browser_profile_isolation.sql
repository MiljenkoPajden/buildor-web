-- ═══════════════════════════════════════════════════════════
-- 007_browser_profile_isolation.sql
-- Phase 1-3 — Browser Profile Isolation: bookmarks, credentials, settings, activity
-- Run AFTER 006_identity_architecture.sql
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 1. EXTEND profiles — active_profile_id
-- ─────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists active_profile_id uuid references public.browser_profiles(id) on delete set null;


-- ─────────────────────────────────────────────────────────
-- 2. PROFILE BOOKMARKS — scoped bookmarks per browser profile
-- ─────────────────────────────────────────────────────────

create table if not exists public.profile_bookmarks (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.browser_profiles(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  url             text not null,
  favicon_url     text,
  folder          text not null default 'default',
  sort_order      integer not null default 0,
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profile_bookmarks enable row level security;

create policy "Users manage own bookmarks"
  on public.profile_bookmarks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists idx_profile_bookmarks_profile
  on public.profile_bookmarks (profile_id, folder, sort_order);
create index if not exists idx_profile_bookmarks_owner
  on public.profile_bookmarks (owner_id, profile_id);


-- ─────────────────────────────────────────────────────────
-- 3. PROFILE CREDENTIALS — encrypted vault per profile
-- encrypted_value: AES-GCM ciphertext (client-side encrypted)
-- encryption_iv: initialization vector for decryption
-- Server NEVER sees plaintext passwords.
-- ─────────────────────────────────────────────────────────

create table if not exists public.profile_credentials (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.browser_profiles(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  service_name    text not null,
  service_url     text,
  username        text,
  encrypted_value text not null,
  encryption_iv   text not null,
  notes           text,
  category        text not null default 'general'
    check (category in ('general', 'api_key', 'ssh', 'ftp', 'oauth', 'database', 'other')),
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profile_credentials enable row level security;

create policy "Users manage own credentials"
  on public.profile_credentials for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists idx_profile_credentials_profile
  on public.profile_credentials (profile_id, service_name);
create index if not exists idx_profile_credentials_owner
  on public.profile_credentials (owner_id);


-- ─────────────────────────────────────────────────────────
-- 4. PROFILE SETTINGS — per-profile key-value preferences
-- ─────────────────────────────────────────────────────────

create table if not exists public.profile_settings (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.browser_profiles(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  key             text not null,
  value           jsonb not null default '{}',
  updated_at      timestamptz not null default now(),
  unique (profile_id, key)
);

alter table public.profile_settings enable row level security;

create policy "Users manage own profile settings"
  on public.profile_settings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);


-- ─────────────────────────────────────────────────────────
-- 5. PROFILE ACTIVITY LOG — in-app history per profile
-- ─────────────────────────────────────────────────────────

create table if not exists public.profile_activity_log (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.browser_profiles(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  action          text not null,
  url             text,
  title           text,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

alter table public.profile_activity_log enable row level security;

create policy "Users manage own activity log"
  on public.profile_activity_log for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists idx_profile_activity_log
  on public.profile_activity_log (profile_id, created_at desc);


-- ─────────────────────────────────────────────────────────
-- 6. HELPER: ensure_default_profile()
-- Auto-creates a "Personal" profile if user has none
-- ─────────────────────────────────────────────────────────

create or replace function public.ensure_default_profile()
returns uuid as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
  from public.browser_profiles
  where owner_id = auth.uid() and is_default = true;

  if v_profile_id is null then
    insert into public.browser_profiles (owner_id, name, partition_key, is_default, icon_color)
    values (auth.uid(), 'Personal', 'default', true, '#57c3ff')
    returning id into v_profile_id;
  end if;

  return v_profile_id;
end;
$$ language plpgsql security definer;

grant execute on function public.ensure_default_profile() to authenticated;


-- ─────────────────────────────────────────────────────────
-- 7. HELPER: switch_profile(target_profile_id)
-- Updates active profile + audit log
-- ─────────────────────────────────────────────────────────

drop function if exists public.switch_profile(uuid);

create or replace function public.switch_profile(target_profile_id uuid)
returns json as $$
declare
  v_profile public.browser_profiles%rowtype;
begin
  select * into v_profile
  from public.browser_profiles
  where id = target_profile_id and owner_id = auth.uid();

  if not found then
    return json_build_object('error', 'profile_not_found');
  end if;

  -- Update active profile on user's profiles row
  update public.profiles set active_profile_id = target_profile_id where id = auth.uid();

  -- Touch last_used_at
  update public.browser_profiles set last_used_at = now() where id = target_profile_id;

  -- Audit event
  perform public.log_audit_event(
    'profile.switch', 'browser_profile', target_profile_id,
    null, v_profile.client_id, 'success', null,
    json_build_object('profile_name', v_profile.name)::jsonb
  );

  return json_build_object(
    'ok', true,
    'profile_id', v_profile.id,
    'profile_name', v_profile.name,
    'client_id', v_profile.client_id
  );
end;
$$ language plpgsql security definer;

grant execute on function public.switch_profile(uuid) to authenticated;


-- ─────────────────────────────────────────────────────────
-- 8. PLAN LIMIT ENFORCEMENT — restrict profile count by plan
-- ─────────────────────────────────────────────────────────

create or replace function public.check_profile_limit()
returns trigger as $$
declare
  v_plan text;
  v_count integer;
  v_limit integer;
begin
  select plan into v_plan from public.profiles where id = new.owner_id;

  select count(*) into v_count from public.browser_profiles where owner_id = new.owner_id;

  v_limit := case v_plan
    when 'free' then 1
    when 'pro' then 5
    when 'team' then 999
    else 1
  end;

  if v_count >= v_limit then
    raise exception 'Profile limit reached for % plan (max %)', v_plan, v_limit;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists check_profile_limit_before_insert on public.browser_profiles;

create trigger check_profile_limit_before_insert
  before insert on public.browser_profiles
  for each row execute function public.check_profile_limit();


-- ─────────────────────────────────────────────────────────
-- 9. HELPER: create_browser_profile(name, client_id, icon_color)
-- Creates profile with partition_key auto-generated
-- ─────────────────────────────────────────────────────────

create or replace function public.create_browser_profile(
  p_name text,
  p_client_id uuid default null,
  p_icon_color text default '#57c3ff'
)
returns json as $$
declare
  v_profile_id uuid;
  v_partition text;
  v_count integer;
begin
  -- Generate unique partition key
  select count(*) into v_count from public.browser_profiles where owner_id = auth.uid();
  v_partition := 'profile_' || auth.uid()::text || '_' || v_count;

  insert into public.browser_profiles (owner_id, name, partition_key, client_id, icon_color, is_default)
  values (auth.uid(), p_name, v_partition, p_client_id, p_icon_color, false)
  returning id into v_profile_id;

  -- Audit
  perform public.log_audit_event(
    'profile.create', 'browser_profile', v_profile_id,
    null, p_client_id, 'success', null,
    json_build_object('profile_name', p_name, 'icon_color', p_icon_color)::jsonb
  );

  return json_build_object(
    'ok', true,
    'profile_id', v_profile_id,
    'partition_key', v_partition
  );
end;
$$ language plpgsql security definer;

grant execute on function public.create_browser_profile(text, uuid, text) to authenticated;


-- ─────────────────────────────────────────────────────────
-- 10. REGISTER SCHEMA VERSION
-- ─────────────────────────────────────────────────────────

insert into public.schema_versions (version, name)
values (7, '007_browser_profile_isolation')
on conflict (version) do nothing;
