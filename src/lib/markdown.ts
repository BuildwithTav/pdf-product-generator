import { sanitizeGeneratedText } from "@/lib/text";
import type { Project, Section } from "@/types/db";

export function buildMarkdownExport(project: Project, sections: Section[]): string {
  const ordered = sections.slice().sort((a, b) => a.order_index - b.order_index);

  const header = [
    `# ${sanitizeGeneratedText(project.product_name)}`,
    project.subtitle ? `\n*${sanitizeGeneratedText(project.subtitle)}*` : "",
    project.author_name ? `\n**${sanitizeGeneratedText(project.author_name)}**` : "",
    "\n\n## Contents\n",
    ordered.map((s, i) => `${i + 1}. ${sanitizeGeneratedText(s.title)}`).join("\n"),
  ].join("");

  const body = ordered
    .map((s) =>
      s.content
        ? sanitizeGeneratedText(s.content)
        : `## ${sanitizeGeneratedText(s.title)}\n\n*Not generated yet.*`
    )
    .join("\n\n---\n\n");

  return `${header}\n\n---\n\n${body}\n`;
}
