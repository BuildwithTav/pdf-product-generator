"use client";

import { useState } from "react";
import { useRegisterSteps } from "@/components/shell/StepsContext";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { OutlineEditor } from "@/components/workspace/OutlineEditor";
import { SectionList } from "@/components/workspace/SectionList";
import { DesignPanel } from "@/components/workspace/DesignPanel";
import { LivePreview } from "@/components/workspace/LivePreview";
import { ExportPanel } from "@/components/workspace/ExportPanel";
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
}: {
  initialProject: Project;
  initialSections: Section[];
}) {
  const [project, setProject] = useState(initialProject);
  const [sections, setSections] = useState(initialSections);
  const [tab, setTab] = useState<Tab>(initialSections.length === 0 ? "outline" : "write");

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

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8">
        <EyebrowLabel>{project.niche}</EyebrowLabel>
        <h1 className="font-display text-3xl font-medium text-app-ink">{project.product_name}</h1>
      </div>

      {tab === "outline" && (
        <OutlineEditor
          projectId={project.id}
          sections={sections}
          hasContent={sections.some((s) => s.content)}
          onGenerated={(next) => setSections(next)}
          onSaved={(next) => setSections(next)}
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
