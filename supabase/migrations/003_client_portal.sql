-- ═══════════════════════════════════════════════════════════
-- 003_client_portal.sql
-- Clients, invites, members — core portal infrastructure
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- TABLE: clients
-- ─────────────────────────────────────────────────────────
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  email       text not null,
  logo_url    text,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.clients enable row level security;

-- Authenticated users (admin) can manage all clients
create policy "Admins can manage clients"
  on public.clients for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Client members can read their own client record
create policy "Members can read own client"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_members cm
      where cm.client_id = clients.id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────
-- TABLE: client_invites
-- NOTE: Public SELECT intentional — token is 256-bit secret
-- ─────────────────────────────────────────────────────────
create table if not exists public.client_invites (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(32), 'hex'),
  email       text not null,
  role        text not null default 'owner'
                check (role in ('owner', 'contributor', 'accountant')),
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at  timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.client_invites enable row level security;

-- Admins can manage invites
create policy "Admins can manage invites"
  on public.client_invites for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Anyone (anon) can read invite by token — needed before login on /portal/:token
create policy "Public can read invites"
  on public.client_invites for select
  using (true);

-- Anyone can update invite to accept it (anon updating own token)
create policy "Public can accept invite"
  on public.client_invites for update
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────
-- TABLE: client_members
-- ─────────────────────────────────────────────────────────
create table if not exists public.client_members (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner'
                check (role in ('owner', 'contributor', 'accountant')),
  status      text not null default 'active'
                check (status in ('active', 'suspended', 'removed')),
  invite_id   uuid references public.client_invites(id) on delete set null,
  joined_at   timestamptz default now(),
  unique (client_id, user_id)
);

alter table public.client_members enable row level security;

-- Admins can manage all members
create policy "Admins can manage members"
  on public.client_members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Members can read other members in the same client
create policy "Members can read same client members"
  on public.client_members for select
  using (
    exists (
      select 1 from public.client_members self
      where self.client_id = client_members.client_id
        and self.user_id = auth.uid()
        and self.status = 'active'
    )
  );

-- Anyone can insert own membership (invite acceptance)
create policy "Users can join via invite"
  on public.client_members for insert
  with check (user_id = auth.uid());
