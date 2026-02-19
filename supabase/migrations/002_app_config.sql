-- App config (Supabase URL, anon key, Google/GitHub API keys). Single source of truth for admin settings.
-- Run in Supabase Dashboard → SQL Editor.

create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.app_config enable row level security;

-- Anyone can read (so the app can load config in any browser once connected)
create policy "Allow read app_config"
  on public.app_config for select
  using (true);

-- Only authenticated users can insert/update (admin must be logged in to save)
create policy "Authenticated can update app_config"
  on public.app_config for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Optional: allow anon to update so first-time setup works before anyone is logged in (remove if you want only auth)
drop policy if exists "Authenticated can update app_config" on public.app_config;
create policy "Authenticated or anon can update app_config"
  on public.app_config for all
  using (true)
  with check (true);

comment on table public.app_config is 'Key-value store for admin API config (supabase_url, supabase_anon_key, google_*, github_*).';
