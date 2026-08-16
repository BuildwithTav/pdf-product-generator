"use client";

import ReactMarkdown from "react-markdown";
import { getFontPairing, getPalette } from "@/lib/design-presets";
import { ICON_COMPONENTS, isIconId } from "@/lib/icons";
import type { DesignBrief, Project, Section } from "@/types/db";

export function LivePreview({
  project,
  sections,
}: {
  project: Project;
  sections: Section[];
}) {
  const designBrief: DesignBrief | null = project.design_brief;
  const palette = getPalette(designBrief?.paletteId ?? "ink-slate");
  const fonts = getFontPairing(designBrief?.fontPairingId ?? "playfair-inter");
  const visible = sections
    .filter((s) => s.content)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const CoverIcon = isIconId(designBrief?.coverIcon) ? ICON_COMPONENTS[designBrief.coverIcon] : null;

  const fontHref = `https://fonts.googleapis.com/css2?family=${fonts.headingGoogleFont}&family=${fonts.bodyGoogleFont}&display=swap`;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500">
        Live preview
      </div>
      <link rel="stylesheet" href={fontHref} />
      <div
        className="max-h-[75vh] overflow-y-auto p-8"
        style={{
          background: palette.background,
          color: palette.text,
          fontFamily: `'${fonts.body}', sans-serif`,
        }}
      >
        <div
          className="relative mb-6 overflow-hidden rounded-lg p-8 text-white"
          style={{ background: palette.primary }}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: -80,
              right: -80,
              width: 200,
              height: 200,
              background: palette.accent,
              opacity: 0.15,
            }}
          />
          {CoverIcon && (
            <div
              className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <CoverIcon className="h-6 w-6" style={{ color: palette.accent }} />
            </div>
          )}
          <div className="relative mb-2 text-xs font-semibold uppercase tracking-widest opacity-80">
            {project.niche}
          </div>
          <h1
            style={{ fontFamily: `'${fonts.heading}', serif` }}
            className="relative text-3xl font-bold"
          >
            {project.product_name}
          </h1>
          {project.subtitle && <p className="relative mt-2 opacity-90">{project.subtitle}</p>}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm" style={{ color: palette.muted }}>
            Generated sections will appear here as they&apos;re written.
          </p>
        ) : (
          visible.map((s, i) => {
            const SectionIcon = isIconId(s.icon) ? ICON_COMPONENTS[s.icon] : null;
            return (
              <div key={s.id} className="mb-10">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: palette.accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="h-1 max-w-[80px] flex-1 rounded"
                    style={{ background: palette.accent }}
                  />
                  {SectionIcon && (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{ background: palette.accent }}
                    >
                      <SectionIcon className="h-4 w-4 text-white" />
                    </span>
                  )}
                </div>
                <h2
                  style={{ fontFamily: `'${fonts.heading}', serif`, color: palette.primary }}
                  className="mb-3 text-xl font-bold"
                >
                  {s.title}
                </h2>
                <div
                  className="prose-sm max-w-none [&_blockquote]:my-4 [&_blockquote]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:p-3 [&_blockquote]:italic [&_p]:mb-3"
                  style={
                    {
                      "--tw-prose-blockquote-border": palette.accent,
                    } as React.CSSProperties
                  }
                >
                  <ReactMarkdown
                    components={{
                      blockquote: (props) => (
                        <blockquote
                          style={{ background: palette.surface, borderColor: palette.accent, color: palette.secondary }}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {s.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
