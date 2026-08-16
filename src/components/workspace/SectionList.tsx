"use client";

import { useState } from "react";
import { Check, Pencil, RefreshCw, Wand2 } from "lucide-react";
import type { Section } from "@/types/db";
import { MAX_REGENERATIONS_PER_SECTION } from "@/lib/config";

const STATUS_STYLE: Record<Section["status"], string> = {
  pending: "bg-neutral-100 text-neutral-500",
  generating: "bg-blue-50 text-blue-600",
  generated: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
};

export function SectionList({
  projectId,
  sections,
  onUpdate,
}: {
  projectId: string;
  sections: Section[];
  onUpdate: (section: Section) => void;
}) {
  return (
    <div className="space-y-3">
      {sections
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((s, i) => (
          <SectionCard
            key={s.id}
            projectId={projectId}
            section={s}
            index={i}
            onUpdate={onUpdate}
          />
        ))}
    </div>
  );
}

function SectionCard({
  projectId,
  section,
  index,
  onUpdate,
}: {
  projectId: string;
  section: Section;
  index: number;
  onUpdate: (section: Section) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(section.content ?? "");
  const [instruction, setInstruction] = useState("");
  const [showInstruction, setShowInstruction] = useState(false);
  const [error, setError] = useState("");

  const hasContent = Boolean(section.content);
  const regenLimitReached = section.regenerate_count >= MAX_REGENERATIONS_PER_SECTION;

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${section.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instruction ? { instruction } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data.section);
      setDraftContent(data.section.content);
      setInstruction("");
      setShowInstruction(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate section.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate(data.section);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edits.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (res.ok) onUpdate(data.section);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
            {index + 1}
          </span>
          <h3 className="text-sm font-semibold text-neutral-900">{section.title}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[section.status]}`}>
          {section.status}
        </span>
      </div>

      <p className="mb-3 text-xs text-neutral-500">{section.summary}</p>

      {editing ? (
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={10}
          className="mb-3 w-full rounded-md border border-neutral-200 p-2.5 font-mono text-xs outline-none focus:border-neutral-900"
        />
      ) : hasContent ? (
        <div className="mb-3 max-h-32 overflow-hidden rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-600">
          {section.content}
        </div>
      ) : null}

      {showInstruction && (
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional instruction for the regeneration, e.g. 'make it punchier'"
          className="mb-3 w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900"
        />
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {!hasContent ? (
          <button
            onClick={generate}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {busy ? "Writing…" : "Generate"}
          </button>
        ) : (
          <>
            <button
              onClick={() => (showInstruction ? generate() : setShowInstruction(true))}
              disabled={busy || regenLimitReached}
              title={regenLimitReached ? "Regeneration limit reached for this section" : ""}
              className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy ? "Regenerating…" : showInstruction ? "Confirm regenerate" : "Regenerate"}
            </button>
            <button
              onClick={() => {
                setEditing((e) => !e);
                setDraftContent(section.content ?? "");
              }}
              className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Cancel" : "Edit"}
            </button>
            {editing && (
              <button
                onClick={saveEdit}
                disabled={busy}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Save
              </button>
            )}
            {section.status !== "approved" && !editing && (
              <button
                onClick={approve}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:border-green-400"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
            )}
          </>
        )}
        {regenLimitReached && (
          <span className="text-[11px] text-neutral-400">Regeneration limit reached</span>
        )}
      </div>
    </div>
  );
}
