"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

export interface FastTrackAnswers {
  productName: string;
  niche: string;
  audience: string;
  corePromise: string;
  toneReference: string;
  chapterCountRequested: string;
}

type FieldKey = keyof FastTrackAnswers;

interface StepConfig {
  key: FieldKey;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  placeholder: string;
  type: "text" | "textarea" | "number";
  required: boolean;
}

const STEPS: StepConfig[] = [
  {
    key: "productName",
    eyebrow: "Step 1",
    title: (
      <>
        What&apos;s your product <em className="italic text-app-accent">called?</em>
      </>
    ),
    subtitle: "The title your buyer sees on the cover.",
    placeholder: "e.g. The 30-Day Content Batching Playbook",
    type: "text",
    required: true,
  },
  {
    key: "niche",
    eyebrow: "Step 2",
    title: (
      <>
        What niche is this <em className="italic text-app-accent">for?</em>
      </>
    ),
    subtitle: "A short phrase is enough — Claude uses this to steer everything else.",
    placeholder: "e.g. Social media growth for coaches",
    type: "text",
    required: true,
  },
  {
    key: "audience",
    eyebrow: "Step 3",
    title: (
      <>
        Who&apos;s the <em className="italic text-app-accent">buyer?</em>
      </>
    ),
    subtitle: "Be specific — the more real this person feels, the sharper the writing.",
    placeholder: "e.g. Solo coaches with under 5k followers who feel invisible online",
    type: "text",
    required: true,
  },
  {
    key: "corePromise",
    eyebrow: "Step 4",
    title: (
      <>
        What will they <em className="italic text-app-accent">walk away with?</em>
      </>
    ),
    subtitle: "The core promise or outcome this product delivers.",
    placeholder: "What will the buyer be able to do or achieve after using this?",
    type: "textarea",
    required: true,
  },
  {
    key: "toneReference",
    eyebrow: "Step 5 · Optional",
    title: (
      <>
        Any tone you want <em className="italic text-app-accent">matched?</em>
      </>
    ),
    subtitle: "Skip this if you're not sure — Claude will pick a tone that fits your niche.",
    placeholder: "e.g. Warm and direct, like talking to a smart friend",
    type: "text",
    required: false,
  },
  {
    key: "chapterCountRequested",
    eyebrow: "Step 6 · Optional",
    title: (
      <>
        How many chapters or <em className="italic text-app-accent">modules?</em>
      </>
    ),
    subtitle: "Leave blank and Claude will decide based on scope.",
    placeholder: "e.g. 7",
    type: "number",
    required: false,
  },
];

export function FastTrackWizard({
  submitting,
  error,
  onBack,
  onComplete,
}: {
  submitting: boolean;
  error: string;
  onBack: () => void;
  onComplete: (answers: FastTrackAnswers) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FastTrackAnswers>({
    productName: "",
    niche: "",
    audience: "",
    corePromise: "",
    toneReference: "",
    chapterCountRequested: "",
  });

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canAdvance = !step.required || form[step.key].trim().length > 0;

  function update(value: string) {
    setForm((f) => ({ ...f, [step.key]: value }));
  }

  function goNext() {
    if (!canAdvance) return;
    if (isLastStep) {
      onComplete(form);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    if (stepIndex === 0) {
      onBack();
    } else {
      setStepIndex((i) => i - 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-8">
        <ProgressBar step={stepIndex + 1} total={STEPS.length} />
      </div>

      <div className="rounded-2xl border border-app-border bg-app-surface p-10 shadow-sm">
        <EyebrowLabel tone="accent">{step.eyebrow}</EyebrowLabel>
        <h1 className="mb-2 mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
          {step.title}
        </h1>
        <p className="mb-6 text-sm text-app-muted">{step.subtitle}</p>

        {step.type === "textarea" ? (
          <textarea
            autoFocus
            rows={4}
            value={form[step.key]}
            onChange={(e) => update(e.target.value)}
            placeholder={step.placeholder}
            className="w-full resize-none rounded-xl border border-app-border bg-white px-4 py-3 text-base text-app-ink outline-none transition focus:border-app-accent"
          />
        ) : (
          <input
            autoFocus
            type={step.type}
            min={step.type === "number" ? 1 : undefined}
            max={step.type === "number" ? 20 : undefined}
            value={form[step.key]}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goNext();
            }}
            placeholder={step.placeholder}
            className="w-full rounded-xl border border-app-border bg-white px-4 py-3 text-base text-app-ink outline-none transition focus:border-app-accent"
          />
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            variant="primary"
            onClick={goNext}
            disabled={!canAdvance || submitting}
            trailingIcon={isLastStep ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          >
            {submitting ? "Setting up…" : isLastStep ? "Continue to blueprint" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
