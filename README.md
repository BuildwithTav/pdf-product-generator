# PDF Product Generator

Turn a short form into a fully written, fully designed, ready-to-sell digital
product PDF. Standalone product, separate from Carousel Studio (own repo, own
Supabase project, own deploy).

## Core flow

1. **Intake form** — product name, niche, audience, core promise, optional
   tone reference and chapter count.
2. **Skeleton generation** — Claude proposes chapter titles + one-line
   summaries. Editable, reorderable, regenerable before anything is written.
3. **Section-by-section content generation** — each section is generated
   individually via the Claude API; regenerate one section without touching
   the rest.
4. **Design brief generation** — Claude picks a palette, font pairing, and
   layout mood from curated options; the user can override any of them via a
   palette picker / font dropdown / mood selector (never raw color/font
   input).
5. **Live preview** — approved/generated sections render into a styled
   preview as they're written.
6. **Export** — formatted PDF (cover, auto TOC, header/footer, page numbers)
   and a raw `.md` file, both generated from the same source content.

## Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind v4
- **Database/auth**: Supabase (Postgres + RLS + Storage + Auth)
- **AI**: Anthropic API (`@anthropic-ai/sdk`), tool-use for structured output
  (skeleton, design brief), plain text for section content
- **PDF rendering**: HTML → PDF via Puppeteer (full `puppeteer` locally,
  `puppeteer-core` + `@sparticuz/chromium` in serverless/production)
- **Images**: Pexels API — Claude picks the search terms per section and for
  the cover
- **Icons**: Lucide

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: checking/writing the member allowlist during login |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (optional) | All Claude generation calls |
| `PEXELS_API_KEY` | Stock photo search for covers and section imagery |
| `NEXT_PUBLIC_SITE_URL` | Magic-link redirect target |

### Database setup

Run `supabase/migrations/0001_init.sql` against a fresh Supabase project (SQL
editor or `supabase db push`). It creates `profiles`, `allowed_emails`,
`projects`, `sections`, RLS policies scoping everything to `auth.uid()`, and a
private `generated-pdfs` storage bucket.

## Access model (resolved open question)

Skool has no public membership API, so this uses an **email allowlist**:

1. An admin inserts approved member emails into `public.allowed_emails`
   (service-role only — no UI yet, use the Supabase SQL editor or a script).
2. A user requests a sign-in link at `/login`. `/api/auth/request-link` only
   sends a Supabase magic link if the email is on the allowlist (the response
   is identical either way, so the allowlist can't be probed).
3. `/auth/callback` re-checks the allowlist after the magic link is
   redeemed and signs the user back out if they were removed in the
   meantime, before creating/updating their `profiles` row.

This is deliberately manual for v1. A semi-automated sync (e.g. a scheduled
job reading Skool's member export) can replace the manual insert later
without touching the rest of the auth flow.

## Other open questions — how v1 resolves them

- **Chapter count limit**: capped at `MAX_SECTIONS` (20) in
  `src/lib/config.ts`.
- **Regeneration limit**: capped at `MAX_REGENERATIONS_PER_SECTION` (5) per
  section, enforced server-side in the section generation route.
- **PDF storage**: Supabase Storage, private `generated-pdfs` bucket, one
  object per project at `{user_id}/{project_id}.pdf`, served via a 1-hour
  signed URL.

## Known v1 limitations

- The table of contents lists chapter titles in order but does not include
  page numbers — computing exact page numbers for AI-generated,
  variable-length content requires a two-pass render (or a post-process pass
  with `pdf-lib`) that's left for a follow-up iteration. Global page numbers
  do appear in the PDF footer.
- The allowlist has no admin UI yet; manage it directly in Supabase.
- Puppeteer needs outbound network access at render time to fetch Google
  Fonts and Pexels images — make sure that's allowed wherever this deploys.

## Project structure

```
src/
  app/
    login/, auth/                — magic-link auth
    dashboard/                   — project list
    new/                         — intake form
    project/[id]/                — the workspace (outline → write & design → export)
    api/projects/...             — all generation + CRUD endpoints
  components/
    workspace/                   — OutlineEditor, SectionList, DesignPanel, LivePreview, ExportPanel
  lib/
    supabase/                    — browser/server/middleware clients
    anthropic.ts, prompts.ts     — Claude client + prompt/schema definitions
    design-presets.ts            — curated palettes / font pairings / layout moods
    pexels.ts                    — stock photo search
    pdf/template.ts, pdf/generate.ts — HTML document template + Puppeteer render
    markdown.ts                  — raw .md export
supabase/migrations/0001_init.sql
```

## What's deliberately not built (v1)

- No Canva API integration
- No voice-profile trainer, niche-discovery tool, social post generator
- No fixed template picker — design is generated per PDF from the curated
  option sets above, not chosen from a preset library
- No direct Stripe integration — access is gated entirely by the allowlist
