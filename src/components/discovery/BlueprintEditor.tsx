"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Button } from "@/components/ui/Button";
import { LENGTH_TIERS, PRODUCT_FORMATS } from "@/lib/design-presets";
import type { LengthTier } from "@/types/db";

export interface BlueprintDraft {
  productName: string;
  subtitle: string;
  audience: string;
  problem: string;
  corePromise: string;
  transformation: string;
  format: string;
  toneReference: string;
  purpose: string;
  ctaNextStep: string;
  lengthTier: LengthTier;
}

export function BlueprintEditor({
  draft,
  contentsPreview,
  regenerating,
  approving,
  error,
  onChange,
  onImprove,
  onApprove,
}: {
  draft: BlueprintDraft;
  contentsPreview: string[];
  regenerating: boolean;
  approving: boolean;
  error: string;
  onChange: (draft: BlueprintDraft) => void;
  onImprove: () => void;
  onApprove: () => void;
}) {
  function set<K extends keyof BlueprintDraft>(key: K, value: BlueprintDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <EyebrowLabel tone="accent">Blueprint</EyebrowLabel>
          <h1 className="mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
            The strategy, before we <em className="italic text-app-accent">write a word</em>
          </h1>
        </div>
        <Button variant="secondary" onClick={onImprove} disabled={regenerating} icon={<RefreshCw className="h-4 w-4" />}>
          {regenerating ? "Improving…" : "Improve with AI"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Product title" value={draft.productName} onChange={(v) => set("productName", v)} full />
        <TextField label="Subtitle" value={draft.subtitle} onChange={(v) => set("subtitle", v)} full />
        <TextField label="Target customer" value={draft.audience} onChange={(v) => set("audience", v)} />
        <TextField label="Core problem" value={draft.problem} onChange={(v) => set("problem", v)} />
        <TextField label="Core promise" value={draft.corePromise} onChange={(v) => set("corePromise", v)} />
        <TextField label="Transformation" value={draft.transformation} onChange={(v) => set("transformation", v)} />
        <SelectField
          label="Format"
          value={draft.format}
          onChange={(v) => set("format", v)}
          options={PRODUCT_FORMATS}
        />
        <TextField label="Tone" value={draft.toneReference} onChange={(v) => set("toneReference", v)} />
        <TextField label="Purpose" value={draft.purpose} onChange={(v) => set("purpose", v)} full />
        <TextField label="Next step / CTA" value={draft.ctaNextStep} onChange={(v) => set("ctaNextStep", v)} full />
      </div>

      <div className="mt-6">
        <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-app-muted">
          Product length
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {LENGTH_TIERS.map((tier) => {
            const selected = draft.lengthTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => set("lengthTier", tier.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-app-accent bg-app-accent-soft"
                    : "border-app-border bg-app-surface hover:border-app-accent/50"
                }`}
              >
                <div className="text-sm font-medium text-app-ink">{tier.name}</div>
                <div className="text-xs font-medium text-app-accent">{tier.pageRange}</div>
                <div className="mt-1 text-xs text-app-muted">{tier.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-app-border bg-app-surface p-6">
        <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-app-muted">
          Proposed contents
        </span>
        <ul className="space-y-1.5 text-sm text-app-ink">
          {contentsPreview.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-app-accent">·</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        <Button variant="primary" onClick={onApprove} disabled={approving} trailingIcon={<Sparkles className="h-4 w-4" />}>
          {approving ? "Building outline…" : "Approve & write"}
        </Button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-app-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-app-border px-3 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-app-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-app-border px-3 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
