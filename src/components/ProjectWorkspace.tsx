"use client";

import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { OutlineEditor } from "@/components/workspace/OutlineEditor";
import { SectionList } from "@/components/workspace/SectionList";
import { DesignPanel } from "@/components/workspace/DesignPanel";
import { LivePreview } from "@/components/workspace/LivePreview";
import { ExportPanel } from "@/components/workspace/ExportPanel";
import type { Project, Section } from "@/types/db";

type Tab = "outline" | "write" | "export";

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

  function updateSection(section: Section) {
    setSections((prev) => {
      const exists = prev.some((s) => s.id === section.id);
      return exists ? prev.map((s) => (s.id === section.id ? section : s)) : [...prev, section];
    });
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {project.niche}
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">{project.product_name}</h1>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm font-medium">
          {(
            [
              ["outline", "1. Outline"],
              ["write", "2. Write & design"],
              ["export", "3. Export"],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-md px-4 py-2 transition ${
                tab === value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
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
      </main>
    </div>
  );
}
