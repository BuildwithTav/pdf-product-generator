"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRegisterSteps } from "@/components/shell/StepsContext";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { OutlineEditor } from "@/components/workspace/OutlineEditor";
import { SectionList } from "@/components/workspace/SectionList";
import { DesignPanel } from "@/components/workspace/DesignPanel";
import { LivePreview } from "@/components/workspace/LivePreview";
import { ExportPanel } from "@/components/workspace/ExportPanel";
import { PaywallCard } from "@/components/workspace/PaywallCard";
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
        if (data.paid) setPaid(true);
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
          <PaywallCard projectId={project.id} productName={project.product_name} onUnlocked={() => setPaid(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
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
            // Only auto-advance on the very first save (outline just went
            // from empty to populated) — a customer coming back later to
            // tweak a title/order shouldn't get yanked off the outline tab
            // every time they save.
            const firstSave = sections.length === 0;
            setSections(next);
            if (firstSave) setTab("write");
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
