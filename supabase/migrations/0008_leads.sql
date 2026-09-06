-- Lead capture: "want the full breakdown on how to sell this?" email
-- opt-in, shown after export (never gating generation itself). Written
-- exclusively by /api/leads via the service-role client, same pattern as
-- project_payments -- no client insert/select policy, so this table is
-- unreachable from the browser directly.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  project_id uuid references public.projects(id) on delete set null,
  source text not null,
  synced_to_systeme boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
