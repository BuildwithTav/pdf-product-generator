-- PDF Product Generator: product journey rebuild
-- Run this against the same Supabase project 0001_init.sql already ran against.

-- ---------------------------------------------------------------------------
-- business_profiles: minimal seed of "shared business memory" — one row per
-- anonymous session, holding what discovery has learned about the user so
-- far. Read/pre-filled by the discovery flow, not yet a full workspace UI.
-- ---------------------------------------------------------------------------
create table if not exists public.business_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  background text,
  audience_hint text,
  interests text,
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "business_profiles: crud own" on public.business_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists business_profiles_set_updated_at on public.business_profiles;
create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects: new strategy fields from the Blueprint stage
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists path text check (path in ('discover', 'build', 'fast_track')),
  add column if not exists problem text,
  add column if not exists transformation text,
  add column if not exists format text,
  add column if not exists purpose text,
  add column if not exists cta_next_step text,
  add column if not exists blueprint_approved boolean not null default false;

-- ---------------------------------------------------------------------------
-- projects.status: remap the old 5-value enum to the new one
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_status_check;

update public.projects set status = 'idea' where status = 'draft';
update public.projects set status = 'blueprint' where status = 'skeleton_ready';
update public.projects set status = 'writing' where status = 'generating';
update public.projects set status = 'ready_to_design' where status = 'ready';
update public.projects set status = 'complete' where status = 'exported';

alter table public.projects
  add constraint projects_status_check
  check (status in ('idea', 'blueprint', 'writing', 'ready_to_design', 'complete'));

alter table public.projects alter column status set default 'idea';
