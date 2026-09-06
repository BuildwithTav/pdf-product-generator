-- The teaser rate limit was purely per-IP, which meant anyone sharing a
-- public IP with someone else -- most commonly mobile customers behind
-- carrier-grade NAT, where thousands of distinct phones can share one
-- address -- shared the same 5-per-day pool. One person testing the app
-- could exhaust it for every other real customer on that network. Adding
-- user_id lets the app enforce the real limit (per anonymous session) and
-- keep IP only as a much looser backstop against someone spinning up many
-- fresh sessions from one address to bypass the per-session cap.
alter table public.teaser_usage
  add column user_id uuid;

create index teaser_usage_user_created_idx on public.teaser_usage (user_id, created_at);
