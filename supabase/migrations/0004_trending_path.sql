-- Adds the "trending" entry path (the "Surprise me" open-ended discovery
-- option) to the set of values projects.path allows. The constraint was
-- created unnamed via 0002's `add column ... check (...)`, so Postgres
-- auto-named it using the standard <table>_<column>_check pattern — the
-- same pattern 0002 relied on for projects_status_check.
alter table public.projects drop constraint if exists projects_path_check;

alter table public.projects
  add constraint projects_path_check
  check (path in ('discover', 'build', 'fast_track', 'trending'));
