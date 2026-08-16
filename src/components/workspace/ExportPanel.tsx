"use client";

import { useState } from "react";
import { Download, FileDown, FileText } from "lucide-react";
import type { Project, Section } from "@/types/db";

export function ExportPanel({ project, sections }: { project: Project; sections: Section[] }) {
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const writtenCount = sections.filter((s) => s.content).length;
  const canExport = Boolean(project.design_brief) && writtenCount > 0;

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
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-neutral-900">Export</h2>
      <p className="mb-5 text-sm text-neutral-500">
        Both outputs are generated from the same content — the formatted PDF for selling, the
        Markdown file for editing further in Canva, Docs, or Word.
      </p>

      {!canExport && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {project.design_brief
            ? "Generate at least one section's content before exporting."
            : "Generate a design brief and at least one section's content before exporting."}
        </p>
      )}

      <div className="mb-4 text-xs text-neutral-500">
        {writtenCount} / {sections.length} sections written
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportPdf}
          disabled={!canExport || exporting}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          {exporting ? "Rendering PDF…" : "Export formatted PDF"}
        </button>

        <a
          href={canExport ? `/api/projects/${project.id}/export/markdown` : undefined}
          aria-disabled={!canExport}
          className={`flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 ${
            !canExport ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <FileText className="h-4 w-4" />
          Download Markdown (.md)
        </a>
      </div>

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
        >
          <Download className="h-4 w-4" /> Your PDF is ready — download it
        </a>
      )}
    </div>
  );
}
