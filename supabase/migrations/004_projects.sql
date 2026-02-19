-- ═══════════════════════════════════════════════════════════
-- 004_projects.sql
-- Projects and internal messaging
-- Run AFTER 003_client_portal.sql
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- TABLE: projects
-- ─────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  name          text not null,
  description   text,
  status        text not null default 'active'
                  check (status in ('active', 'upcoming', 'completed', 'archived', 'paused')),
  progress      integer not null default 0 check (progress between 0 and 100),
  start_date    date,
  due_date      date,
  archive_url   text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.projects enable row level security;

-- Admins full access
create policy "Admins can manage projects"
  on public.projects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- owner + contributor can read projects
create policy "Members can read projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.client_members cm
      where cm.client_id = projects.client_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('owner', 'contributor')
    )
  );

-- ─────────────────────────────────────────────────────────
-- TABLE: project_messages
-- Internal comments/notes
-- ─────────────────────────────────────────────────────────
create table if not exists public.project_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 2000),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.project_messages enable row level security;

-- Admins can manage all messages
create policy "Admins can manage messages"
  on public.project_messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- owner + contributor can read messages
create policy "Members can read messages"
  on public.project_messages for select
  using (
    exists (
      select 1 from public.client_members cm
      where cm.client_id = project_messages.client_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('owner', 'contributor')
    )
  );

-- owner + contributor can post messages
create policy "Members can post messages"
  on public.project_messages for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.client_members cm
      where cm.client_id = project_messages.client_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and cm.role in ('owner', 'contributor')
    )
  );

-- Users can delete own messages
create policy "Members can delete own messages"
  on public.project_messages for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────
-- TRIGGER: touch projects.updated_at on new message
-- ─────────────────────────────────────────────────────────
create or replace function public.touch_project_on_message()
returns trigger as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_project_message_insert on public.project_messages;
create trigger on_project_message_insert
  after insert on public.project_messages
  for each row execute function public.touch_project_on_message();
