import { marked } from "marked";
import { getFontPairing, getPalette } from "@/lib/design-presets";
import { iconSvgMarkup } from "@/lib/icons";
import type { DesignBrief, Project, Section } from "@/types/db";

marked.setOptions({ breaks: false, gfm: true });

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function googleFontsHref(brief: DesignBrief) {
  const fonts = getFontPairing(brief.fontPairingId);
  const families = [fonts.headingGoogleFont, fonts.bodyGoogleFont]
    .map((f) => `family=${f}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

function moodStyles(mood: DesignBrief["layoutMood"]) {
  switch (mood) {
    case "bold":
      return {
        headingSize: "2.6rem",
        sectionHeadingSize: "2rem",
        bodySize: "12.5pt",
        lineHeight: "1.6",
        accentBar: "10px",
        coverShapeOpacity: "0.9",
        coverIconSize: 96,
      };
    case "editorial":
      return {
        headingSize: "2.3rem",
        sectionHeadingSize: "1.7rem",
        bodySize: "11.5pt",
        lineHeight: "1.75",
        accentBar: "3px",
        coverShapeOpacity: "0.5",
        coverIconSize: 56,
      };
    case "minimal":
    default:
      return {
        headingSize: "2.1rem",
        sectionHeadingSize: "1.6rem",
        bodySize: "11pt",
        lineHeight: "1.65",
        accentBar: "4px",
        coverShapeOpacity: "0.35",
        coverIconSize: 64,
      };
  }
}

export interface RenderableProject extends Project {
  design_brief: DesignBrief;
}

export function buildDocumentHtml(project: RenderableProject, sections: Section[]): string {
  const palette = getPalette(project.design_brief.paletteId);
  const fonts = getFontPairing(project.design_brief.fontPairingId);
  const mood = moodStyles(project.design_brief.layoutMood);
  const ordered = sections.slice().sort((a, b) => a.order_index - b.order_index);

  const sectionsHtml = ordered
    .map((section, i) => {
      const bodyHtml = marked.parse(section.content || "") as string;
      const iconBadge = section.icon
        ? `<span class="chapter-icon">${iconSvgMarkup(section.icon, { size: 18, color: "#fff" })}</span>`
        : "";
      return `
        <section class="chapter" id="section-${i}">
          <div class="chapter-kicker">
            <span class="chapter-number">${String(i + 1).padStart(2, "0")}</span>
            <span class="chapter-rule"></span>
            ${iconBadge}
          </div>
          <h2>${escapeHtml(section.title)}</h2>
          <div class="chapter-body">${bodyHtml}</div>
        </section>`;
    })
    .join("\n");

  const tocHtml = ordered
    .map(
      (s, i) =>
        `<li><span class="toc-number">${String(i + 1).padStart(2, "0")}</span><span class="toc-title">${escapeHtml(
          s.title
        )}</span></li>`
    )
    .join("\n");

  const coverIconMarkup = iconSvgMarkup(project.design_brief.coverIcon, {
    size: mood.coverIconSize,
    color: palette.accent,
    strokeWidth: 1.5,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${googleFontsHref(project.design_brief)}" rel="stylesheet">
<style>
  :root {
    --primary: ${palette.primary};
    --secondary: ${palette.secondary};
    --accent: ${palette.accent};
    --background: ${palette.background};
    --surface: ${palette.surface};
    --text: ${palette.text};
    --muted: ${palette.muted};
    --font-heading: '${fonts.heading}', serif;
    --font-body: '${fonts.body}', sans-serif;
    --accent-bar: ${mood.accentBar};
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--background);
    color: var(--text);
    font-family: var(--font-body);
    font-size: ${mood.bodySize};
    line-height: ${mood.lineHeight};
  }
  h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; color: var(--primary); margin: 0 0 0.5em; }
  .page { padding: 56px 60px; }
  .cover {
    position: relative;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 64px 88px;
    color: #fff;
    background: var(--primary);
  }
  .cover::before {
    content: "";
    position: absolute;
    top: -140px;
    right: -140px;
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: var(--accent);
    opacity: calc(${mood.coverShapeOpacity} * 0.3);
  }
  .cover::after {
    content: "";
    position: absolute;
    bottom: -180px;
    left: -120px;
    width: 440px;
    height: 440px;
    border-radius: 50%;
    border: 44px solid var(--secondary);
    opacity: calc(${mood.coverShapeOpacity} * 0.35);
  }
  .cover-icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${mood.coverIconSize * 1.9}px;
    height: ${mood.coverIconSize * 1.9}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    margin-bottom: 32px;
  }
  .cover-content { position: relative; z-index: 1; }
  .cover-eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 11pt; opacity: 0.85; margin-bottom: 18px; }
  .cover h1 { color: #fff; font-size: ${mood.headingSize}; line-height: 1.1; margin-bottom: 14px; }
  .cover .subtitle { font-size: 13pt; opacity: 0.92; max-width: 32em; }
  .cover .author { margin-top: 40px; font-size: 10.5pt; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.8; }
  .toc-page { break-before: page; padding: 72px 64px; }
  .toc-page h2 { font-size: 1.6rem; margin-bottom: 32px; }
  .toc-page ul { list-style: none; margin: 0; padding: 0; }
  .toc-page li {
    display: flex; align-items: baseline; gap: 16px;
    padding: 10px 0; border-bottom: 1px solid var(--surface);
    font-size: 12pt;
  }
  .toc-number { font-family: var(--font-heading); color: var(--accent); font-weight: 700; width: 2.2em; }
  .toc-title { color: var(--text); }
  .chapter { break-before: page; padding: 64px 64px 40px; }
  .chapter-kicker { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
  .chapter-number { font-family: var(--font-heading); color: var(--accent); font-size: 14pt; font-weight: 700; }
  .chapter-rule { flex: 1; height: var(--accent-bar); background: var(--accent); border-radius: 4px; max-width: 120px; }
  .chapter-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 9px; background: var(--accent); flex-shrink: 0;
  }
  .chapter h2 { font-size: ${mood.sectionHeadingSize}; margin-bottom: 20px; }
  .chapter-body p { margin: 0 0 1em; orphans: 3; widows: 3; }
  .chapter-body ul, .chapter-body ol { margin: 0 0 1em; padding-left: 1.4em; }
  .chapter-body li { margin-bottom: 0.4em; }
  .chapter-body blockquote {
    margin: 1.4em 0; padding: 16px 20px; background: var(--surface);
    border-left: var(--accent-bar) solid var(--accent); border-radius: 6px;
    font-style: italic; color: var(--secondary);
    break-inside: avoid;
  }
  .chapter-body blockquote p { margin: 0; }
  .chapter-body strong { color: var(--primary); }
  .chapter-body h1, .chapter-body h2, .chapter-body h3 {
    font-size: 1.35em;
    font-weight: 600;
    color: var(--primary);
    margin-top: 1.8em;
    margin-bottom: 0.7em;
    padding-top: 0.9em;
    border-top: 2px solid var(--surface);
    break-after: avoid;
    break-inside: avoid;
  }
  .chapter-body h1:first-child, .chapter-body h2:first-child, .chapter-body h3:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
  .chapter-body table {
    width: 100%; border-collapse: collapse; margin: 1.6em 0;
    font-size: 0.92em; border-radius: 8px; overflow: hidden;
    box-shadow: 0 0 0 1px var(--surface);
  }
  .chapter-body thead { background: var(--primary); }
  .chapter-body th { color: #fff; text-align: left; padding: 11px 16px; font-weight: 600; }
  .chapter-body td { padding: 11px 16px; border-bottom: 1px solid var(--surface); }
  .chapter-body tbody tr:nth-child(even) { background: var(--surface); }
  .chapter-body tr { break-inside: avoid; }
  .chapter-body ul:has(input[type="checkbox"]) { list-style: none; padding-left: 0; }
  .chapter-body li:has(input[type="checkbox"]) {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 8px 0; border-bottom: 1px dashed var(--surface);
  }
  .chapter-body input[type="checkbox"] {
    appearance: none; -webkit-appearance: none;
    width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0;
    border: 2px solid var(--accent); border-radius: 5px;
  }
  .chapter-body input[type="checkbox"]:checked { background: var(--accent); }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-icon">${coverIconMarkup}</div>
    <div class="cover-content">
      <div class="cover-eyebrow">${escapeHtml(project.niche)}</div>
      <h1>${escapeHtml(project.product_name)}</h1>
      ${project.subtitle ? `<div class="subtitle">${escapeHtml(project.subtitle)}</div>` : ""}
      ${project.author_name ? `<div class="author">${escapeHtml(project.author_name)}</div>` : ""}
    </div>
  </div>

  <div class="toc-page">
    <h2>Contents</h2>
    <ul>${tocHtml}</ul>
  </div>

  ${sectionsHtml}
</body>
</html>`;
}
