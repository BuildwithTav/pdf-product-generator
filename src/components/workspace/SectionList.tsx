"use client";

import { useState } from "react";
import { Check, Pencil, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ICON_COMPONENTS, isIconId } from "@/lib/icons";
import type { Section } from "@/types/db";
import { MAX_REGENERATIONS_PER_SECTION } from "@/lib/config";

const STATUS_STYLE: Record<Section["status"], string> = {
  pending: "bg-app-surface-hover text-app-muted",
  generating: "bg-app-accent-soft text-app-accent",
  generated: "bg-app-sand-soft text-app-sand",
  approved: "bg-app-mint-soft text-app-mint",
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
  const Icon = isIconId(section.icon) ? ICON_COMPONENTS[section.icon] : null;

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
    <div className="rounded-2xl border border-app-border bg-app-surface p-4 transition-shadow hover:shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
              <Icon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-xs font-semibold text-app-accent">
              {index + 1}
            </span>
          )}
          <h3 className="font-display text-base font-medium text-app-ink">{section.title}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[section.status]}`}>
          {section.status}
        </span>
      </div>

      <p className="mb-3 text-xs text-app-muted">{section.summary}</p>

      {editing ? (
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={10}
          className="mb-3 w-full rounded-md border border-app-border p-2.5 font-mono text-xs text-app-ink outline-none transition focus:border-app-accent"
        />
      ) : hasContent ? (
        <div className="mb-3 max-h-32 overflow-hidden rounded-md bg-app-surface-hover p-2.5 text-xs text-app-muted">
          {section.content}
        </div>
      ) : null}

      {showInstruction && (
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional instruction for the regeneration, e.g. 'make it punchier'"
          className="mb-3 w-full rounded-md border border-app-border px-2.5 py-1.5 text-xs text-app-ink outline-none transition focus:border-app-accent"
        />
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {!hasContent ? (
          <Button variant="primary" onClick={generate} disabled={busy} className="!px-3 !py-1.5 text-xs" icon={<Wand2 className="h-3.5 w-3.5" />}>
            {busy ? "Writing…" : "Generate"}
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 text-xs"
              onClick={() => (showInstruction ? generate() : setShowInstruction(true))}
              disabled={busy || regenLimitReached}
              title={regenLimitReached ? "Regeneration limit reached for this section" : ""}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              {busy ? "Regenerating…" : showInstruction ? "Confirm regenerate" : "Regenerate"}
            </Button>
            <Button
              variant="secondary"
              className="!px-3 !py-1.5 text-xs"
              onClick={() => {
                setEditing((e) => !e);
                setDraftContent(section.content ?? "");
              }}
              icon={<Pencil className="h-3.5 w-3.5" />}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
            {editing && (
              <Button variant="primary" className="!px-3 !py-1.5 text-xs" onClick={saveEdit} disabled={busy}>
                Save
              </Button>
            )}
            {section.status !== "approved" && !editing && (
              <button
                onClick={approve}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-full border border-app-mint/40 px-3 py-1.5 text-xs font-medium text-app-mint transition hover:bg-app-mint-soft disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
            )}
          </>
        )}
        {regenLimitReached && (
          <span className="text-[11px] text-app-muted">Regeneration limit reached</span>
        )}
      </div>
    </div>
  );
}
