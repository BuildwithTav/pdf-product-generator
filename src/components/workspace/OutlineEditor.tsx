"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import type { Section } from "@/types/db";

interface DraftSection {
  id?: string;
  title: string;
  summary: string;
}

export function OutlineEditor({
  projectId,
  sections,
  hasContent,
  onGenerated,
  onSaved,
}: {
  projectId: string;
  sections: Section[];
  hasContent: boolean;
  onGenerated: (sections: Section[]) => void;
  onSaved: (sections: Section[]) => void;
}) {
  const [draft, setDraft] = useState<DraftSection[]>(
    sections.map((s) => ({ id: s.id, title: s.title, summary: s.summary }))
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEmpty = sections.length === 0;

  async function generateOutline() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/skeleton`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.sections.map((s: Section) => ({ id: s.id, title: s.title, summary: s.summary })));
      onGenerated(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate outline.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveOutline() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/skeleton`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.sections.map((s: Section) => ({ id: s.id, title: s.title, summary: s.summary })));
      onSaved(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save outline.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(index: number, key: "title" | "summary", value: string) {
    setDraft((d) => d.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const next = [...d];
      const target = index + dir;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setDraft((d) => d.filter((_, i) => i !== index));
  }

  function addSection() {
    setDraft((d) => [...d, { title: "New section", summary: "" }]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Outline</h2>
          <p className="text-sm text-neutral-500">
            Review the proposed chapters, then edit, reorder, or regenerate before content is written.
          </p>
        </div>
        <button
          onClick={generateOutline}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
        >
          {isEmpty ? <Wand2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? "Generating…" : isEmpty ? "Generate outline" : "Regenerate outline"}
        </button>
      </div>

      {hasContent && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Some sections already have written content. Regenerating the whole outline will clear
          it. Editing titles/summaries here only affects unwritten sections until you regenerate
          that section.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {draft.map((s, i) => (
          <div key={s.id ?? i} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-start gap-3">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                {i + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  value={s.title}
                  onChange={(e) => updateField(i, "title", e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm font-medium outline-none focus:border-neutral-900"
                />
                <textarea
                  value={s.summary}
                  onChange={(e) => updateField(i, "summary", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-900"
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => move(i, -1)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100" title="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(i, 1)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100" title="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(i)} className="rounded p-1 text-red-400 hover:bg-red-50" title="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSection}
        className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        <Plus className="h-4 w-4" /> Add section
      </button>

      {draft.length > 0 && (
        <button
          onClick={saveOutline}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save outline"}
        </button>
      )}
    </div>
  );
}
