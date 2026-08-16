"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Button } from "@/components/ui/Button";
import { ICON_COMPONENTS, isIconId } from "@/lib/icons";
import { PRODUCT_FORMATS } from "@/lib/design-presets";
import type { ProductIdea } from "@/lib/prompts";

export function OpportunityCard({
  ideas,
  submitting,
  error,
  onBack,
  onBuild,
  onAdjust,
}: {
  ideas: ProductIdea[];
  submitting: boolean;
  error: string;
  onBack: () => void;
  onBuild: (idea: ProductIdea) => void;
  onAdjust: (note: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const [note, setNote] = useState("");

  const idea = ideas[index];
  const Icon = isIconId(idea.icon) ? ICON_COMPONENTS[idea.icon] : Sparkles;
  const formatName = PRODUCT_FORMATS.find((f) => f.id === idea.format)?.name ?? idea.format;
  const hasMore = index < ideas.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      <EyebrowLabel tone="accent">Recommended product</EyebrowLabel>
      <h1 className="mb-6 mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
        Here&apos;s what we&apos;d <em className="italic text-app-accent">build</em>
      </h1>

      <div className="rounded-2xl border border-app-border bg-app-surface p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
          <Icon className="h-6 w-6" />
        </div>

        <h2 className="mb-1 font-display text-2xl font-medium text-app-ink">{idea.productName}</h2>
        <p className="mb-6 text-sm text-app-muted">{idea.niche}</p>

        <dl className="mb-6 space-y-4">
          <Row label="Who it's for" value={idea.audience} />
          <Row label="Problem" value={idea.problem} />
          <Row label="Transformation" value={idea.transformation} />
          <Row label="Format" value={`${formatName} · ${idea.suggestedSize}`} />
        </dl>

        <p className="mb-6 rounded-lg bg-app-mint-soft p-3 text-sm text-app-ink">
          <span className="font-medium">Why this works: </span>
          {idea.rationale}
        </p>

        {adjusting && (
          <div className="mb-6">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. make it more beginner-friendly, or focus on a narrower audience"
              className="w-full rounded-xl border border-app-border px-4 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent"
            />
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => onBuild(idea)} disabled={submitting}>
            {submitting ? "Setting up…" : "Build this product"}
          </Button>
          {hasMore && (
            <Button variant="secondary" onClick={() => setIndex((i) => i + 1)} icon={<RefreshCw className="h-4 w-4" />}>
              Show me alternatives
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => (adjusting ? onAdjust(note) : setAdjusting(true))}
            disabled={submitting || (adjusting && !note.trim())}
            icon={<Wand2 className="h-4 w-4" />}
          >
            {adjusting ? "Regenerate with this change" : "Adjust this idea"}
          </Button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-4 flex items-center gap-1.5 text-sm text-app-muted transition hover:text-app-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-app-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-app-ink">{value}</dd>
    </div>
  );
}
