"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, X } from "lucide-react";
import { useRegisterSteps } from "@/components/shell/StepsContext";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { OutlineEditor } from "@/components/workspace/OutlineEditor";
import { SectionList } from "@/components/workspace/SectionList";
import { DesignPanel } from "@/components/workspace/DesignPanel";
import { LivePreview } from "@/components/workspace/LivePreview";
import { ExportPanel } from "@/components/workspace/ExportPanel";
import { PaywallCard } from "@/components/workspace/PaywallCard";
import { COMMUNITY_URL, COMMUNITY_NAME } from "@/lib/promo";
import type { Project, Section } from "@/types/db";

type Tab = "outline" | "write" | "export";

const STEPS: { value: Tab; label: string }[] = [
  { value: "outline", label: "1. Outline" },
  { value: "write", label: "2. Write & design" },
  { value: "export", label: "3. Export" },
];

export function ProjectWorkspace({
  initialProject,
  initialSections,
  initialPaid,
}: {
  initialProject: Project;
  initialSections: Section[];
  initialPaid: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState(initialProject);
  const [sections, setSections] = useState(initialSections);
  const [tab, setTab] = useState<Tab>(initialSections.length === 0 ? "outline" : "write");
  const [paid, setPaid] = useState(initialPaid);
  const [verifying, setVerifying] = useState(
    () => !initialPaid && Boolean(searchParams.get("checkout_session_id"))
  );
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Fast-UX return from Stripe checkout — the webhook is the real source
  // of truth (fires independently of the browser), this just unlocks the
  // page immediately instead of the customer waiting on webhook delivery.
  useEffect(() => {
    const checkoutSessionId = searchParams.get("checkout_session_id");
    if (!checkoutSessionId || paid) return;

    fetch(`/api/projects/${project.id}/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutSessionId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.paid) {
          setPaid(true);
          setJustUnlocked(true);
        }
      })
      .finally(() => {
        setVerifying(false);
        router.replace(`/project/${project.id}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRegisterSteps({
    projectId: project.id,
    projectName: project.product_name,
    steps: STEPS,
    activeStep: tab,
    setStep: (value) => setTab(value as Tab),
  });

  function updateSection(section: Section) {
    setSections((prev) => {
      const exists = prev.some((s) => s.id === section.id);
      return exists ? prev.map((s) => (s.id === section.id ? section : s)) : [...prev, section];
    });
  }

  if (!paid) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        {verifying ? (
          <p className="text-sm text-app-muted">Confirming your payment…</p>
        ) : (
          <PaywallCard
            projectId={project.id}
            productName={project.product_name}
            onUnlocked={() => {
              setPaid(true);
              setJustUnlocked(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      {justUnlocked && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-app-border bg-app-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-ink">
            You&apos;re in! While that&apos;s generating — come say hi in{" "}
            <span className="font-medium">{COMMUNITY_NAME}</span>, it&apos;s free to join.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-app-accent-hover"
            >
              <Users className="h-3.5 w-3.5" /> Join free
            </a>
            <button
              onClick={() => setJustUnlocked(false)}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-app-muted hover:bg-app-surface-hover"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <EyebrowLabel>{project.niche}</EyebrowLabel>
        <h1 className="font-display text-2xl font-medium text-app-ink sm:text-3xl">{project.product_name}</h1>
      </div>

      {tab === "outline" && (
        <OutlineEditor
          projectId={project.id}
          sections={sections}
          hasContent={sections.some((s) => s.content)}
          onGenerated={(next) => setSections(next)}
          onSaved={(next) => {
            // Advance to Write & design whenever nothing has been written
            // yet — covers the normal generate-then-save flow (sections
            // are already populated by onGenerated by the time this
            // fires, so checking sections.length here would always be
            // false). Once real content exists, a later outline tweak
            // shouldn't yank the customer off the outline tab.
            const hasWrittenContent = sections.some((s) => s.content);
            setSections(next);
            if (!hasWrittenContent) setTab("write");
          }}
        />
      )}

      {tab === "write" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <DesignPanel
              projectId={project.id}
              designBrief={project.design_brief}
              onChange={setProject}
            />
            <SectionList projectId={project.id} sections={sections} onUpdate={updateSection} />
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <LivePreview project={project} sections={sections} />
          </div>
        </div>
      )}

      {tab === "export" && <ExportPanel project={project} sections={sections} />}
    </div>
  );
}
