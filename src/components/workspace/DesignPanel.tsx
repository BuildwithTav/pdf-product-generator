"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
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
    <div className="rounded-2xl border border-app-border bg-app-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <EyebrowLabel>Design brief</EyebrowLabel>
          <h3 className="font-display text-lg font-medium text-app-ink">Cover &amp; style</h3>
        </div>
        <Button
          variant="secondary"
          className="!px-3 !py-1.5 text-xs"
          onClick={generate}
          disabled={generating}
          icon={<Wand2 className="h-3.5 w-3.5" />}
        >
          {generating ? "Thinking…" : designBrief ? "Regenerate with AI" : "Generate with AI"}
        </Button>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {designBrief?.rationale && (
        <p className="mb-4 rounded-lg bg-app-accent-soft p-3 text-xs text-app-ink">
          {designBrief.rationale}
        </p>
      )}

      <div className="space-y-5">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-app-muted">Palette</span>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => override({ paletteId: p.id })}
                title={p.name}
                className={`flex h-8 w-8 overflow-hidden rounded-full border-2 transition-transform hover:scale-105 ${
                  designBrief?.paletteId === p.id ? "border-app-accent" : "border-transparent"
                }`}
              >
                <span className="h-full w-1/2" style={{ background: p.primary }} />
                <span className="h-full w-1/2" style={{ background: p.accent }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-app-muted">Font pairing</span>
          <select
            value={designBrief?.fontPairingId ?? ""}
            onChange={(e) => override({ fontPairingId: e.target.value })}
            className="w-full rounded-lg border border-app-border px-2.5 py-1.5 text-xs text-app-ink outline-none transition focus:border-app-accent"
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
          <span className="mb-1.5 block text-xs font-medium text-app-muted">Layout mood</span>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => override({ layoutMood: m.id })}
                title={m.description}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  designBrief?.layoutMood === m.id
                    ? "border-transparent bg-app-accent text-white"
                    : "border-app-border text-app-muted hover:border-app-accent hover:text-app-accent"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-app-muted">Cover icon</span>
          <div className="flex flex-wrap gap-2">
            {ICON_IDS.map((id) => {
              const Icon = ICON_COMPONENTS[id];
              const selected = designBrief?.coverIcon === id;
              return (
                <button
                  key={id}
                  onClick={() => override({ coverIcon: id })}
                  title={id}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    selected
                      ? "border-transparent bg-app-accent text-white"
                      : "border-app-border text-app-muted hover:border-app-accent hover:text-app-accent"
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
