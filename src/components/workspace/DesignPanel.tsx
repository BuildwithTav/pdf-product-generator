"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { FONT_PAIRINGS, LAYOUT_MOODS, PALETTES } from "@/lib/design-presets";
import { ICON_COMPONENTS, ICON_IDS } from "@/lib/icons";
import type { DesignBrief, Project } from "@/types/db";

export function DesignPanel({
  projectId,
  designBrief,
  onChange,
}: {
  projectId: string;
  designBrief: DesignBrief | null;
  onChange: (project: Project) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/design-brief`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate design brief.");
    } finally {
      setGenerating(false);
    }
  }

  async function override(patch: Partial<DesignBrief>) {
    const res = await fetch(`/api/projects/${projectId}/design-brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) onChange(data.project);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Design brief</h3>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {generating ? "Thinking…" : designBrief ? "Regenerate with AI" : "Generate with AI"}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {designBrief?.rationale && (
        <p className="mb-3 rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-600">
          {designBrief.rationale}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-neutral-500">Palette</span>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => override({ paletteId: p.id })}
                title={p.name}
                className={`flex h-8 w-8 overflow-hidden rounded-full border-2 ${
                  designBrief?.paletteId === p.id ? "border-neutral-900" : "border-transparent"
                }`}
              >
                <span className="h-full w-1/2" style={{ background: p.primary }} />
                <span className="h-full w-1/2" style={{ background: p.accent }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-neutral-500">Font pairing</span>
          <select
            value={designBrief?.fontPairingId ?? ""}
            onChange={(e) => override({ fontPairingId: e.target.value })}
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-900"
          >
            <option value="" disabled>
              Choose a font pairing
            </option>
            {FONT_PAIRINGS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-neutral-500">Layout mood</span>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => override({ layoutMood: m.id })}
                className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                  designBrief?.layoutMood === m.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-neutral-500">Cover icon</span>
          <div className="flex flex-wrap gap-2">
            {ICON_IDS.map((id) => {
              const Icon = ICON_COMPONENTS[id];
              const selected = designBrief?.coverIcon === id;
              return (
                <button
                  key={id}
                  onClick={() => override({ coverIcon: id })}
                  title={id}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                    selected
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
