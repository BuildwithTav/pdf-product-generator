-- Records whether the lead explicitly checked the "I agree to receive
-- emails" box, since the UI now requires it before the form can be
-- submitted at all -- kept as its own column (not inferred) so there's a
-- real record of consent, not just an assumption.
alter table public.leads
  add column consented boolean not null default false;
