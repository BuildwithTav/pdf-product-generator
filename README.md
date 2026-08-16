# PDF Product Generator

Turn a short form into a fully written, fully designed, ready-to-sell digital
product PDF. Standalone product, separate from Carousel Studio (own repo, own
Supabase project, own deploy). No account, no login — open it and start.

## Core flow

1. **Intake form** — product name, niche, audience, core promise, optional
   tone reference and chapter count.
2. **Skeleton generation** — Claude proposes chapter titles + one-line
   summaries. Editable, reorderable, regenerable before anything is written.
3. **Section-by-section content generation** — each section is generated
   individually via the Claude API; regenerate one section without touching
   the rest.
4. **Design brief generation** — Claude picks a palette, font pairing, layout
   mood, and accent icon from curated options; the user can override any of
   them via a palette picker / font dropdown / mood selector / icon picker
   (never raw color/font input, and never a photo).
5. **Live preview** — approved/generated sections render into a styled
   preview as they're written.
6. **Export** — formatted PDF (cover, auto TOC, header/footer, page numbers)
   and a raw `.md` file, both generated from the same source content.

## Stack

- **Framework**: Next.js 16 (App Router), TypeScript, Tailwind v4
- **Database**: Supabase (Postgres + RLS + Storage), no auth UI — see
  "Access model" below
- **AI**: Anthropic API (`@anthropic-ai/sdk`), tool-use for structured output
  (skeleton, design brief), plain text for section content
- **PDF rendering**: HTML → PDF via Puppeteer (full `puppeteer` locally,
  `puppeteer-core` + `@sparticuz/chromium` in serverless/production)
- **Visual design**: no photography — color, typography, a Claude-picked
  Lucide accent icon, and CSS/SVG shapes carry the design instead

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
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (optional) | All Claude generation calls |

### Database setup

Run `supabase/migrations/0001_init.sql` against a fresh Supabase project (SQL
editor or `supabase db push`). It creates `projects`, `sections`, RLS
policies scoping everything to `auth.uid()`, and a private `generated-pdfs`
storage bucket.

Then, in the Supabase dashboard, enable **Authentication > Settings > Allow
anonymous sign-ins** — required for the access model below.

## Access model (resolved open question)

There's no login screen and no accounts. Every visitor silently gets their
own Supabase **anonymous session** on first request
(`src/lib/supabase/middleware.ts`), and RLS scopes every `projects`/`sections`
row to that session's `auth.uid()`. Nobody sees or edits anybody else's
drafts, but there's nothing to sign up for or remember.

Tradeoff: clearing cookies or switching browser/device loses access to
existing projects — there's no email/password to recover the session with.
Acceptable for v1; a shareable per-project access link is the natural
follow-up if that becomes a problem.

## Other open questions — how v1 resolves them

- **Chapter count limit**: capped at `MAX_SECTIONS` (20) in
  `src/lib/config.ts`.
- **Regeneration limit**: capped at `MAX_REGENERATIONS_PER_SECTION` (5) per
  section, enforced server-side in the section generation route.
- **PDF storage**: Supabase Storage, private `generated-pdfs` bucket, one
  object per project at `{user_id}/{project_id}.pdf` (the anonymous session's
  user id), served via a 1-hour signed URL.

## Known v1 limitations

- The table of contents lists chapter titles in order but does not include
  page numbers — computing exact page numbers for AI-generated,
  variable-length content requires a two-pass render (or a post-process pass
  with `pdf-lib`) that's left for a follow-up iteration. Global page numbers
  do appear in the PDF footer.
- No cross-device access recovery (see "Access model" above).
- Puppeteer needs outbound network access at render time to fetch Google
  Fonts — make sure that's allowed wherever this deploys.

## Project structure

```
src/
  app/
    dashboard/                   — project list
    new/                         — intake form
    project/[id]/                — the workspace (outline → write & design → export)
    api/projects/...             — all generation + CRUD endpoints
  components/
    workspace/                   — OutlineEditor, SectionList, DesignPanel, LivePreview, ExportPanel
  lib/
    supabase/                    — browser/server clients + anonymous-session middleware
    anthropic.ts, prompts.ts     — Claude client + prompt/schema definitions
    design-presets.ts            — curated palettes / font pairings / layout moods
    icons.ts                     — curated Lucide accent icons (React components + inline SVG for the PDF)
    pdf/template.ts, pdf/generate.ts — HTML document template + Puppeteer render
    markdown.ts                  — raw .md export
supabase/migrations/0001_init.sql
```

## What's deliberately not built (v1)

- No Canva API integration
- No voice-profile trainer, niche-discovery tool, social post generator
- No fixed template picker — design is generated per PDF from the curated
  option sets above, not chosen from a preset library
- No stock photography — icons + CSS/SVG shapes carry the visual design
- No login, accounts, or Stripe integration — access model is the invisible
  anonymous session described above
