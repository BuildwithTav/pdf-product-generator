"use client";

import { useState } from "react";
import { Check, Copy, Download, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Callout } from "@/components/ui/Callout";
import type { Project, Section } from "@/types/db";

export function ExportPanel({ project, sections }: { project: Project; sections: Section[] }) {
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const writtenCount = sections.filter((s) => s.content).length;
  const canExport = Boolean(project.design_brief) && writtenCount > 0;

  async function copyManuscript() {
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/export/markdown`);
      if (!res.ok) throw new Error("Failed to load the manuscript.");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy the manuscript.");
    }
  }

  async function exportPdf() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/export/pdf`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPdfUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-xl rounded-2xl border border-app-border bg-app-surface p-8">
      <EyebrowLabel>Export</EyebrowLabel>
      <h2 className="mb-2 mt-1 font-display text-2xl font-medium text-app-ink">
        Ready to <em className="italic text-app-accent">ship it</em>
      </h2>
      <p className="mb-5 text-sm text-app-muted">
        Both outputs are generated from the same content: the formatted PDF for selling, the
        Markdown file for editing further in Canva, Docs, or Word.
      </p>

      {!canExport && (
        <div className="mb-4">
          <Callout>
            {project.design_brief
              ? "Generate at least one section's content before exporting."
              : "Generate a design brief and at least one section's content before exporting."}
          </Callout>
        </div>
      )}

      <div className="mb-4 text-xs text-app-muted">
        {writtenCount} / {sections.length} sections written
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={exportPdf}
          disabled={!canExport || exporting}
          icon={<FileDown className="h-4 w-4" />}
        >
          {exporting ? "Rendering PDF…" : "Export formatted PDF"}
        </Button>

        <a
          href={canExport ? `/api/projects/${project.id}/export/markdown` : undefined}
          aria-disabled={!canExport}
          className={`inline-flex items-center gap-2 rounded-full border border-app-border px-5 py-2.5 text-sm font-medium text-app-ink transition hover:border-app-accent hover:text-app-accent ${
            !canExport ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <FileText className="h-4 w-4" />
          Download Markdown (.md)
        </a>

        <button
          onClick={copyManuscript}
          disabled={!canExport}
          className="inline-flex items-center gap-2 rounded-full border border-app-border px-5 py-2.5 text-sm font-medium text-app-ink transition hover:border-app-accent hover:text-app-accent disabled:pointer-events-none disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4 text-app-mint" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy full manuscript"}
        </button>
      </div>

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-fit items-center gap-2 rounded-full bg-app-mint-soft px-5 py-2.5 text-sm font-medium text-app-mint transition hover:brightness-95"
        >
          <Download className="h-4 w-4" /> Your PDF is ready, download it
        </a>
      )}
    </div>
  );
}
