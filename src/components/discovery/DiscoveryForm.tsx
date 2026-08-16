"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Button } from "@/components/ui/Button";
import type { BusinessProfile } from "@/types/db";

export interface DiscoveryAnswers {
  background: string;
  audienceHint: string;
  interests: string;
  roughIdea: string;
}

export function DiscoveryForm({
  mode,
  initialProfile,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  mode: "discover" | "build";
  initialProfile: BusinessProfile | null;
  submitting: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (answers: DiscoveryAnswers) => void;
}) {
  const [roughIdea, setRoughIdea] = useState("");
  const [background, setBackground] = useState(initialProfile?.background ?? "");
  const [audienceHint, setAudienceHint] = useState(initialProfile?.audience_hint ?? "");
  const [interests, setInterests] = useState(initialProfile?.interests ?? "");

  const hasProfile = Boolean(initialProfile?.background);
  const canSubmit = mode === "build" ? roughIdea.trim().length > 0 : background.trim().length > 0;

  return (
    <div className="mx-auto max-w-xl">
      <EyebrowLabel tone="accent">{mode === "build" ? "Build my idea" : "Find it for me"}</EyebrowLabel>
      <h1 className="mb-2 mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
        {mode === "build" ? (
          <>
            What&apos;s the <em className="italic text-app-accent">rough idea?</em>
          </>
        ) : (
          <>
            Tell us about <em className="italic text-app-accent">you</em>
          </>
        )}
      </h1>
      <p className="mb-6 text-sm text-app-muted">
        {mode === "build"
          ? "Don't worry about making this sound clever — tell us the idea in your own words. We'll shape it into something sellable."
          : "A few honest details about your background is all we need — we'll turn it into product ideas."}
      </p>

      {hasProfile && (
        <p className="mb-4 rounded-lg bg-app-accent-soft px-3 py-2 text-xs text-app-ink">
          We&apos;ve pre-filled this from what we already know about you — edit anything below.
        </p>
      )}

      <div className="space-y-5 rounded-2xl border border-app-border bg-app-surface p-8">
        {mode === "build" && (
          <Field
            label="What do you want to create?"
            hint="Just a sentence or two is fine."
          >
            <textarea
              autoFocus
              rows={3}
              value={roughIdea}
              onChange={(e) => setRoughIdea(e.target.value)}
              placeholder="e.g. Something to help new dog owners with crate training"
              className="input"
            />
          </Field>
        )}

        <Field
          label={mode === "build" ? "A bit about you (optional)" : "What are you good at, or what have you overcome, that others ask you about?"}
          hint={
            mode === "build"
              ? "I'm not sure — leave it blank and we'll figure it out from the rest."
              : "We need at least a little here — even one or two sentences is enough."
          }
        >
          <textarea
            autoFocus={mode === "discover"}
            rows={3}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g. I've run a dog training business for 6 years and get asked the same questions constantly"
            className="input"
          />
        </Field>

        <Field label="Who do you imagine buying this? (optional)" hint="A rough idea is enough.">
          <input
            value={audienceHint}
            onChange={(e) => setAudienceHint(e.target.value)}
            placeholder="e.g. First-time dog owners who feel overwhelmed"
            className="input"
          />
        </Field>

        <Field label="Anything you'd enjoy writing about? (optional)">
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. Practical routines, not theory"
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit({ background, audienceHint, interests, roughIdea })}
            trailingIcon={<Sparkles className="h-4 w-4" />}
          >
            {submitting ? "Thinking…" : "Find my product ideas"}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid var(--app-border);
          border-radius: 0.75rem;
          padding: 0.65rem 0.9rem;
          font-size: 0.9rem;
          color: var(--app-ink);
          outline: none;
          resize: none;
          transition: border-color 0.15s;
        }
        .input:focus {
          border-color: var(--app-accent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-app-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-app-muted">{hint}</span>}
    </label>
  );
}
