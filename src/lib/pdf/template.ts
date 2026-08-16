import { marked } from "marked";
import { getFontPairing, getPalette } from "@/lib/design-presets";
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
        coverOverlayOpacity: "0.55",
      };
    case "editorial":
      return {
        headingSize: "2.3rem",
        sectionHeadingSize: "1.7rem",
        bodySize: "11.5pt",
        lineHeight: "1.75",
        accentBar: "3px",
        coverOverlayOpacity: "0.35",
      };
    case "minimal":
    default:
      return {
        headingSize: "2.1rem",
        sectionHeadingSize: "1.6rem",
        bodySize: "11pt",
        lineHeight: "1.65",
        accentBar: "4px",
        coverOverlayOpacity: "0.2",
      };
  }
}

export interface RenderableProject extends Project {
  design_brief: DesignBrief;
}

export function buildDocumentHtml(
  project: RenderableProject,
  sections: Section[],
  coverImageUrl: string
): string {
  const palette = getPalette(project.design_brief.paletteId);
  const fonts = getFontPairing(project.design_brief.fontPairingId);
  const mood = moodStyles(project.design_brief.layoutMood);
  const ordered = sections.slice().sort((a, b) => a.order_index - b.order_index);

  const sectionsHtml = ordered
    .map((section, i) => {
      const bodyHtml = marked.parse(section.content || "") as string;
      const imageBlock = section.image_url
        ? `<img class="section-image" src="${section.image_url}" alt="" />`
        : "";
      return `
        <section class="chapter" id="section-${i}">
          <div class="chapter-kicker">
            <span class="chapter-number">${String(i + 1).padStart(2, "0")}</span>
            <span class="chapter-rule"></span>
          </div>
          <h2>${escapeHtml(section.title)}</h2>
          ${imageBlock}
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
  h1, h2, h3 { font-family: var(--font-heading); color: var(--primary); margin: 0 0 0.5em; }
  .page { padding: 56px 60px; }
  .cover {
    position: relative;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 64px;
    color: #fff;
    background: linear-gradient(180deg, rgba(0,0,0,${mood.coverOverlayOpacity}) 0%, rgba(0,0,0,0.75) 100%),
                url('${coverImageUrl}') center/cover no-repeat, var(--primary);
  }
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
  .chapter h2 { font-size: ${mood.sectionHeadingSize}; margin-bottom: 20px; }
  .section-image { width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 24px; }
  .chapter-body p { margin: 0 0 1em; }
  .chapter-body ul, .chapter-body ol { margin: 0 0 1em; padding-left: 1.4em; }
  .chapter-body li { margin-bottom: 0.4em; }
  .chapter-body blockquote {
    margin: 1.4em 0; padding: 16px 20px; background: var(--surface);
    border-left: var(--accent-bar) solid var(--accent); border-radius: 6px;
    font-style: italic; color: var(--secondary);
  }
  .chapter-body blockquote p { margin: 0; }
  .chapter-body strong { color: var(--primary); }
  .chapter-body h1, .chapter-body h2, .chapter-body h3 { font-size: 1.05em; margin-top: 1.2em; }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-eyebrow">${escapeHtml(project.niche)}</div>
    <h1>${escapeHtml(project.product_name)}</h1>
    ${project.subtitle ? `<div class="subtitle">${escapeHtml(project.subtitle)}</div>` : ""}
    ${project.author_name ? `<div class="author">${escapeHtml(project.author_name)}</div>` : ""}
  </div>

  <div class="toc-page">
    <h2>Contents</h2>
    <ul>${tocHtml}</ul>
  </div>

  ${sectionsHtml}
</body>
</html>`;
}
