-- Payment gate: $10 flat per project, no login/credits system for paying
-- customers (a project either has been paid for or hasn't). Also adds the
-- two free-access paths that converge on the same `paid` flag: partner
-- comp codes (manually issued) and the anonymous-session teaser-abuse
-- rate limit.
--
-- Security note: payment status must NEVER be writable by the client,
-- even the project's own owner — the existing "projects: crud own" policy
-- lets an owner update any column on their own row, so simply adding a
-- `paid` column there would let anyone mark their own project paid via a
-- direct Supabase call, without ever paying. Payment status therefore
-- lives in its own table with a read-only policy for the client; only
-- server code using the service-role key (which bypasses RLS) may write
-- it, from the Stripe webhook, the verify-on-return route, or the
-- redeem-code route.

create table public.project_payments (
  project_id uuid primary key references public.projects(id) on delete cascade,
  paid boolean not null default false,
  stripe_checkout_session_id text,
  updated_at timestamptz not null default now()
);

alter table public.project_payments enable row level security;

-- Owner can check whether their own project is paid (needed by the app to
-- show/hide the paywall) but cannot write this table at all — no insert,
-- update, or delete policy exists for the client, so those are denied by
-- RLS's default-deny. Only a service-role client can write it.
create policy "Owner can read their own project's payment status"
  on public.project_payments for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_payments.project_id and p.user_id = auth.uid()
    )
  );

-- Auto-create the payment row (paid = false) the moment a project is
-- created, so every project always has one without the app needing its
-- own privileged insert. security definer makes this run with elevated
-- privileges regardless of who/what triggered the parent insert.
create function public.handle_new_project_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_payments (project_id, paid) values (new.id, false);
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project_payment();

-- Partner free-access codes. Created manually via the Supabase SQL editor
-- when needed, e.g.:
--   insert into free_access_codes (code, remaining_uses, note)
--   values ('PARTNER-JOE', 2, 'podcast guest');
-- Client can look up a code (to show "valid code" before submitting), but
-- cannot write it — the actual decrement-and-redeem happens server-side
-- via the service-role client in /api/projects/[id]/redeem-code, so a
-- client can't just set remaining_uses to a large number on a code it
-- knows.
create table public.free_access_codes (
  code text primary key,
  remaining_uses integer not null default 1,
  note text,
  created_at timestamptz not null default now()
);

alter table public.free_access_codes enable row level security;

create policy "Any authenticated user can look up a free access code"
  on public.free_access_codes for select
  to authenticated
  using (true);

-- Teaser (free idea + blueprint) usage log, keyed by requesting IP rather
-- than session, since an anonymous session can be reset for free
-- (incognito/clear cookies) but an IP is a real, if imperfect, cost to
-- rotate. Used to cap free teaser starts per IP per day. Client may insert
-- (log its own attempt) and read (so the server route can count recent
-- attempts), but not update/delete — otherwise a client could just wipe
-- its own history to reset the limit.
create table public.teaser_usage (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

alter table public.teaser_usage enable row level security;

create policy "Any authenticated user can log teaser usage"
  on public.teaser_usage for insert
  to authenticated
  with check (true);

create policy "Any authenticated user can read teaser usage"
  on public.teaser_usage for select
  to authenticated
  using (true);

create index teaser_usage_ip_created_idx on public.teaser_usage (ip, created_at);
