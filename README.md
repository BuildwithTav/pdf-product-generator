# PDF Product Generator

Turn a short form into a fully written, fully designed, ready-to-sell digital
product PDF. Standalone product, separate from Carousel Studio (own repo, own
Supabase project, own deploy). No account, no login — open it and start.

## Core flow

1. **Pathway selector** — "What do you want to create?" Three entry points,
   all converging into the same builder:
   - **Find it for me** — a few questions about the user's background/who
     they want to help; Claude proposes 3 product ideas (title, audience,
     problem, transformation, format, size estimate) to pick from, ask for
     alternatives, or adjust.
   - **Build my idea** — same idea-proposal flow, anchored around a rough
     concept the user already has instead of free brainstorming.
   - **Fast track** — the original 6-question form, for users who already
     know exactly what they're making.
2. **Blueprint** — before anything is written, Claude produces the full
   product strategy (subtitle, target customer, problem, promise,
   transformation, format, tone, purpose, next-step CTA, a short contents
   preview) for the user to review, edit, or regenerate. Nothing is written
   until this is approved.
3. **Skeleton generation** — Claude proposes chapter titles + one-line
   summaries, grounded in the approved blueprint. Editable, reorderable,
   regenerable before content is written.
4. **Section-by-section content generation** — each section is generated
   individually via the Claude API; regenerate one section without touching
   the rest.
5. **Design brief generation** — Claude picks a palette, font pairing, layout
   mood, and accent icon from curated options; the user can override any of
   them via a palette picker / font dropdown / mood selector / icon picker
   (never raw color/font input, and never a photo).
6. **Live preview** — approved/generated sections render into a styled
   preview as they're written.
7. **Export** — formatted PDF (cover, auto TOC, header/footer, page numbers),
   a raw `.md` file, and a one-click "copy full manuscript" — all generated
   from the same source content, so the manuscript can be taken into Canva,
   Docs, or another design tool.

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

Run the migrations in order against a fresh Supabase project (SQL editor or
`supabase db push`):

1. `supabase/migrations/0001_init.sql` — `projects`, `sections`, RLS policies
   scoping everything to `auth.uid()`, and a private `generated-pdfs` storage
   bucket.
2. `supabase/migrations/0002_product_journey.sql` — adds the `business_profiles`
   table (the seed of shared memory across products), the Blueprint-stage
   columns on `projects`, and remaps `status` to the 5-value pathway/journey
   enum (`idea` / `blueprint` / `writing` / `ready_to_design` / `complete`).
   **Run this even on a project that already has 0001 applied** — it's
   additive and safely remaps any existing rows.

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
    (app)/dashboard/              — project list
    (app)/new/                    — pathway selector → discovery/blueprint → wizard orchestrator
    (app)/project/[id]/           — the workspace (outline → write & design → export)
    (app)/layout.tsx              — persistent sidebar shell (project nav + current project's steps)
    api/projects/...              — CRUD + skeleton/design-brief generation
    api/projects/[id]/blueprint/  — blueprint generation + edits/approval
    api/ideas/                    — product idea proposals (discovery paths)
    api/business-profile/         — shared "what we know about you" seed
  components/
    discovery/                    — PathSelector, DiscoveryForm, OpportunityCard, FastTrackWizard, BlueprintEditor
    workspace/                    — OutlineEditor, SectionList, DesignPanel, LivePreview, ExportPanel
    shell/                        — Sidebar, StepsContext (lets a page publish its steps into the sidebar)
    ui/                           — Button, ChoiceCard, EyebrowLabel, Callout, ProgressBar design-system primitives
  lib/
    supabase/                     — browser/server clients + anonymous-session middleware
    anthropic.ts, prompts.ts      — Claude client + prompt/schema definitions
    design-presets.ts             — curated palettes / font pairings / layout moods / product formats
    icons.ts                      — curated Lucide accent icons (React components + inline SVG for the PDF)
    pdf/template.ts, pdf/generate.ts — HTML document template + Puppeteer render
    markdown.ts                   — raw .md export (also used for "copy full manuscript")
supabase/migrations/
```

## Deferred to follow-up phases (not built yet)

Scoped and intentionally deferred so the journey/information-architecture
rebuild above could ship as a coherent, checkable unit:

- The 3-pane manuscript editor (chapter nav + AI action toolbar — rewrite /
  shorten / expand / add examples, etc.) replacing today's linear section
  list.
- Named design systems (Editorial/Minimal/Bold/Luxury/Workbook/Creator) with
  previews, replacing the separate palette/font/mood pickers.
- Cover image/logo/website/footer customization.
- Dashboard thumbnails, Duplicate, Rename (Delete is built).
- A full standalone business-profile/workspace settings UI — `business_profiles`
  is seeded and pre-fills discovery today, but there's no dedicated page to
  view/edit it yet.
- The persistent "Brain" chat/buddy feature — reserved nav slot exists in the
  sidebar ("Soon"), `business_profiles` is a compatible foundation for it.

## What's deliberately not built (v1)

- No Canva API integration
- No fixed template picker — design is generated per PDF from the curated
  option sets above, not chosen from a preset library
- No stock photography — icons + CSS/SVG shapes carry the visual design
- No login, accounts, or Stripe integration — access model is the invisible
  anonymous session described above
