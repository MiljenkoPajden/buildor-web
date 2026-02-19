-- Admin settings (OAuth credentials etc.). Run in Supabase Dashboard → SQL Editor.
-- Data is stored in the database instead of browser localStorage.
-- RLS: only authenticated users can read and write.

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.admin_settings enable row level security;

-- Only logged-in users can read (e.g. load Google/GitHub OAuth config)
create policy "Authenticated users can read admin settings"
  on public.admin_settings for select
  using (auth.role() = 'authenticated');

-- Only logged-in users can insert/update (e.g. save OAuth credentials)
create policy "Authenticated users can insert admin settings"
  on public.admin_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update admin settings"
  on public.admin_settings for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete admin settings"
  on public.admin_settings for delete
  using (auth.role() = 'authenticated');

comment on table public.admin_settings is 'Key-value store for admin config (OAuth client IDs/secrets etc.). Keys: oauth_google, oauth_github.';
