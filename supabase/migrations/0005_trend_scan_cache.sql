-- Shared cache for the "Surprise me" trend scan. Trending topics are a
-- global, non-personalized concept ("what's trending this week"), not
-- per-user data, so caching the last scan for everyone (not per-user) is
-- correct and directly cuts cost: repeated scans within the TTL window
-- (multiple users, or the same user retrying) reuse one paid Claude call
-- instead of paying for a fresh one every time.
--
-- This is a deliberate, scoped exception to the rest of this app's
-- owner-only RLS pattern: the cached content isn't sensitive or
-- user-specific, so any authenticated (including anonymous-session) user
-- may read and refresh it.
create table public.trend_scan_cache (
  id text primary key default 'latest',
  topics jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.trend_scan_cache enable row level security;

create policy "Any authenticated user can read the trend scan cache"
  on public.trend_scan_cache for select
  to authenticated
  using (true);

create policy "Any authenticated user can refresh the trend scan cache"
  on public.trend_scan_cache for insert
  to authenticated
  with check (true);

create policy "Any authenticated user can update the trend scan cache"
  on public.trend_scan_cache for update
  to authenticated
  using (true)
  with check (true);
