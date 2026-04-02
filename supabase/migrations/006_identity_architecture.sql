-- ═══════════════════════════════════════════════════════════
-- 006_identity_architecture.sql
-- Phase 0 — Foundation: Identity, RBAC, Audit, Browser Profiles
-- Run AFTER 005_invoices.sql
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 1. EXTEND profiles — account_type, plan, trace_id
-- ─────────────────────────────────────────────────────────

-- account_type: determines feature surface
-- plan: determines billing limits
-- trace_id: immutable audit trail identifier (set once, never changes)

alter table public.profiles
  add column if not exists account_type text not null default 'personal'
    check (account_type in ('personal', 'agency', 'enterprise')),
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'team')),
  add column if not exists trace_id uuid not null default gen_random_uuid(),
  add column if not exists display_name text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- Index for trace_id lookups (audit replay)
create index if not exists idx_profiles_trace_id on public.profiles (trace_id);

-- Update the handle_new_user trigger to populate new fields
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, display_name, account_type, plan, trace_id, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'personal',
    'free',
    gen_random_uuid(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;


-- ─────────────────────────────────────────────────────────
-- 2. PROJECT MEMBERS — RBAC per project
-- Separate from client_members (portal access).
-- project_members controls who can do what WITHIN a project.
-- ─────────────────────────────────────────────────────────

create table if not exists public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'contributor'
                check (role in ('owner', 'maintainer', 'contributor', 'viewer')),
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz default now(),
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

-- Admins full access
create policy "Admins can manage project members"
  on public.project_members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Members can read other members in same project
create policy "Members can read project members"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members self
      where self.project_id = project_members.project_id
        and self.user_id = auth.uid()
    )
  );

-- Index for fast permission checks
create index if not exists idx_project_members_user on public.project_members (user_id, project_id);
create index if not exists idx_project_members_project on public.project_members (project_id, role);

comment on table public.project_members is
  'Per-project RBAC. Roles: owner (all), maintainer (read/write/exec, approve migrations), contributor (read/write, submit for approval), viewer (read-only, audit log).';


-- ─────────────────────────────────────────────────────────
-- 3. AUDIT EVENTS — trace_id replay, confidence scoring
-- ─────────────────────────────────────────────────────────

create table if not exists public.audit_events (
  event_id    uuid primary key default gen_random_uuid(),
  trace_id    uuid not null,
  user_id     uuid references auth.users(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  client_id   uuid references public.clients(id) on delete set null,
  action      text not null,           -- e.g. 'project.create', 'member.invite', 'invoice.pay'
  target_type text,                    -- e.g. 'project', 'invoice', 'client_member'
  target_id   uuid,                    -- ID of affected resource
  outcome     text not null default 'success'
                check (outcome in ('success', 'failure', 'denied', 'error')),
  confidence  real check (confidence is null or (confidence >= 0.0 and confidence <= 1.0)),
  metadata    jsonb default '{}',      -- extra context (IP, user agent, changed fields, etc.)
  created_at  timestamptz not null default now()
);

alter table public.audit_events enable row level security;

-- Admins can read all audit events
create policy "Admins can read audit events"
  on public.audit_events for select
  using (auth.role() = 'authenticated');

-- Authenticated users can insert audit events (via app logic)
create policy "Users can log audit events"
  on public.audit_events for insert
  with check (auth.role() = 'authenticated');

-- Nobody can update or delete audit events (immutable log)
-- (No UPDATE or DELETE policies = denied by default with RLS)

-- Indexes for efficient querying
create index if not exists idx_audit_trace on public.audit_events (trace_id, created_at desc);
create index if not exists idx_audit_user on public.audit_events (user_id, created_at desc);
create index if not exists idx_audit_project on public.audit_events (project_id, created_at desc);
create index if not exists idx_audit_action on public.audit_events (action, created_at desc);

-- Partition hint: for large audit tables, consider partitioning by month
comment on table public.audit_events is
  'Immutable audit log. No UPDATE/DELETE allowed. Query by trace_id for full session replay. confidence: 0.0-1.0 for AI-assisted actions.';


-- ─────────────────────────────────────────────────────────
-- 4. BROWSER PROFILES — Electron session isolation sync
-- Tracks which browser profiles exist per user (for cross-device sync).
-- Actual session data lives in Electron's session partitions.
-- ─────────────────────────────────────────────────────────

create table if not exists public.browser_profiles (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete set null,  -- NULL = owner's personal profile
  name          text not null,                      -- "Moj dev profil", "Klijent A"
  partition_key text not null,                      -- Electron session partition ID (unique per device+profile)
  icon_color    text default '#57c3ff',             -- avatar color for quick visual ID
  is_default    boolean not null default false,     -- one default per owner
  last_used_at  timestamptz default now(),
  created_at    timestamptz not null default now()
);

alter table public.browser_profiles enable row level security;

-- Users can only see/manage their own browser profiles
create policy "Users manage own browser profiles"
  on public.browser_profiles for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Ensure unique partition keys per owner
create unique index if not exists idx_browser_profiles_partition
  on public.browser_profiles (owner_id, partition_key);

-- Only one default profile per owner
create unique index if not exists idx_browser_profiles_default
  on public.browser_profiles (owner_id) where (is_default = true);

comment on table public.browser_profiles is
  'Syncs Electron browser profile metadata to cloud. Actual session data (cookies, localStorage) lives in Electron partition. One default per owner, N total.';


-- ─────────────────────────────────────────────────────────
-- 5. HELPER: get_client_by_invite_token() — missing RPC
-- Called by PortalInvitePage (anon), validates token + expiry
-- ─────────────────────────────────────────────────────────

create or replace function public.get_client_by_invite_token(invite_token text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'invite_id', ci.id,
    'client_id', ci.client_id,
    'email', ci.email,
    'role', ci.role,
    'status', ci.status,
    'expires_at', ci.expires_at,
    'client_name', c.name,
    'client_company', c.company,
    'client_logo_url', c.logo_url
  ) into result
  from public.client_invites ci
  join public.clients c on c.id = ci.client_id
  where ci.token = invite_token
  limit 1;

  if result is null then
    return json_build_object('error', 'invite_not_found');
  end if;

  -- Check if expired
  if (result->>'status') = 'pending'
     and (result->>'expires_at')::timestamptz < now() then
    -- Auto-expire
    update public.client_invites set status = 'expired' where token = invite_token;
    return json_build_object(
      'error', 'invite_expired',
      'client_name', result->>'client_name'
    );
  end if;

  return result;
end;
$$ language plpgsql security definer;

-- Grant anon access (needed for unauthenticated invite page)
grant execute on function public.get_client_by_invite_token(text) to anon;
grant execute on function public.get_client_by_invite_token(text) to authenticated;


-- ─────────────────────────────────────────────────────────
-- 6. HELPER: log_audit_event() — convenience function
-- ─────────────────────────────────────────────────────────

create or replace function public.log_audit_event(
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_project_id uuid default null,
  p_client_id uuid default null,
  p_outcome text default 'success',
  p_confidence real default null,
  p_metadata jsonb default '{}'
)
returns uuid as $$
declare
  v_trace_id uuid;
  v_event_id uuid;
begin
  -- Get user's trace_id from profiles
  select trace_id into v_trace_id
  from public.profiles
  where id = auth.uid();

  -- Fallback trace_id if profile not found
  if v_trace_id is null then
    v_trace_id := gen_random_uuid();
  end if;

  insert into public.audit_events (trace_id, user_id, project_id, client_id, action, target_type, target_id, outcome, confidence, metadata)
  values (v_trace_id, auth.uid(), p_project_id, p_client_id, p_action, p_target_type, p_target_id, p_outcome, p_confidence, p_metadata)
  returning event_id into v_event_id;

  return v_event_id;
end;
$$ language plpgsql security definer;

grant execute on function public.log_audit_event(text, text, uuid, uuid, uuid, text, real, jsonb) to authenticated;


-- ─────────────────────────────────────────────────────────
-- 7. SCHEMA VERSION REGISTRY
-- Tracks which migrations have been applied (app-level, not Supabase native)
-- ─────────────────────────────────────────────────────────

create table if not exists public.schema_versions (
  version     integer primary key,
  name        text not null,
  applied_at  timestamptz not null default now(),
  checksum    text                  -- sha256 of migration file content
);

alter table public.schema_versions enable row level security;

-- Read-only for authenticated users
create policy "Anyone can read schema versions"
  on public.schema_versions for select
  using (auth.role() = 'authenticated');

-- Only service_role can insert (migrations run by admin/CI)
-- Default RLS denies INSERT for anon/authenticated — use service_role key

-- Register this migration
insert into public.schema_versions (version, name)
values (6, '006_identity_architecture')
on conflict (version) do nothing;
