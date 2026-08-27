-- Lets a customer choose how long their product should be, instead of
-- forcing every product into the same 8-12 page target regardless of what
-- it actually is (a 1-page checklist and a full workbook shouldn't be
-- padded/squeezed into the same length). Capped at "complete" (20-30
-- pages) — a hard production ceiling, not an open-ended target.
alter table public.projects
  add column length_tier text not null default 'standard';

alter table public.projects
  add constraint projects_length_tier_check check (length_tier in ('quick', 'standard', 'complete'));
