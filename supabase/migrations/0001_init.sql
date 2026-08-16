-- PDF Product Generator: initial schema
-- Run against a fresh Supabase project (separate from any other product's project).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Access control (MVP resolution for the "Skool has no membership API" gap):
-- admins manually add member emails here after verifying Skool membership.
-- Supabase auth still handles login (magic link), this table just gates who
-- is allowed to sign in / use the product. See README "Access model".
-- ---------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email text primary key,
  added_by text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No public policies: only accessible via service-role key (admin scripts / server routes).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_name text not null,
  niche text not null,
  audience text not null,
  core_promise text not null,
  tone_reference text,
  chapter_count_requested int,
  subtitle text,
  author_name text,
  status text not null default 'draft'
    check (status in ('draft', 'skeleton_ready', 'generating', 'ready', 'exported')),
  design_brief jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects: crud own" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists projects_user_id_idx on public.projects (user_id);

-- ---------------------------------------------------------------------------
-- Sections (chapters/modules within a project)
-- ---------------------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  order_index int not null,
  title text not null,
  summary text not null default '',
  content text,
  image_query text,
  image_url text,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'generated', 'approved')),
  regenerate_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sections enable row level security;

create policy "sections: crud own via project" on public.sections
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.user_id = auth.uid()
    )
  );

create index if not exists sections_project_id_idx on public.sections (project_id);
create unique index if not exists sections_project_order_idx on public.sections (project_id, order_index);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage bucket for generated PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('generated-pdfs', 'generated-pdfs', false)
on conflict (id) do nothing;

create policy "generated-pdfs: owner read"
  on storage.objects for select
  using (bucket_id = 'generated-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "generated-pdfs: owner write"
  on storage.objects for insert
  with check (bucket_id = 'generated-pdfs' and (storage.foldername(name))[1] = auth.uid()::text);
