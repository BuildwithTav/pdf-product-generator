import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { FONT_PAIRINGS, LAYOUT_MOODS, PALETTES } from "@/lib/design-presets";
import type { DesignBrief, Section, SkeletonSectionInput } from "@/types/db";

export interface ProjectBrief {
  productName: string;
  niche: string;
  audience: string;
  corePromise: string;
  toneReference?: string | null;
  chapterCountRequested?: number | null;
}

function briefBlock(brief: ProjectBrief) {
  return `Product name: ${brief.productName}
Niche: ${brief.niche}
Target buyer / audience: ${brief.audience}
Core promise / outcome: ${brief.corePromise}
Tone reference: ${brief.toneReference?.trim() || "not specified — pick a tone that fits the niche and audience"}
Requested section count: ${brief.chapterCountRequested ?? "not specified — use your judgement based on scope"}`;
}

// ---------------------------------------------------------------------------
// Skeleton generation
// ---------------------------------------------------------------------------

interface SkeletonSectionWithImage extends SkeletonSectionInput {
  imageQuery: string;
}

const SKELETON_TOOL = {
  name: "propose_skeleton",
  description: "Propose the chapter/section structure for a digital product PDF.",
  input_schema: {
    type: "object" as const,
    properties: {
      sections: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const, description: "Short, compelling chapter/section title." },
            summary: {
              type: "string" as const,
              description: "One sentence describing what this section covers and why it matters.",
            },
            imageQuery: {
              type: "string" as const,
              description:
                "A 2-4 word English search term for a real stock photo (Pexels) that fits this section's topic. Concrete and visual, not abstract.",
            },
          },
          required: ["title", "summary", "imageQuery"],
        },
      },
    },
    required: ["sections"],
  },
};

export async function generateSkeleton(
  brief: ProjectBrief
): Promise<SkeletonSectionWithImage[]> {
  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system:
      "You are an expert instructional designer and ghostwriter who structures digital products " +
      "(ebooks, guides, workbooks) for beginners with no design or writing skill. You produce clear, " +
      "sellable, well-scoped outlines. Sections should build on each other logically and cover the " +
      "promise completely without padding or redundancy.",
    messages: [
      {
        role: "user",
        content: `Propose a chapter/section structure for this digital product:\n\n${briefBlock(
          brief
        )}\n\nIf a section count was requested, use exactly that many sections. Otherwise choose the number that best fits the scope (typically 5-10).`,
      },
    ],
    tools: [SKELETON_TOOL],
    tool_choice: { type: "tool", name: "propose_skeleton" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a skeleton.");
  }

  const input = toolUse.input as { sections: SkeletonSectionWithImage[] };
  return input.sections;
}

// ---------------------------------------------------------------------------
// Section content generation
// ---------------------------------------------------------------------------

export interface SectionGenerationContext {
  brief: ProjectBrief;
  fullSkeleton: SkeletonSectionInput[];
  section: SkeletonSectionInput;
  sectionIndex: number;
  regenerationNote?: string;
}

export async function generateSectionContent(ctx: SectionGenerationContext): Promise<string> {
  const outlineList = ctx.fullSkeleton
    .map((s, i) => `${i + 1}. ${s.title} — ${s.summary}`)
    .join("\n");

  const regenerationInstruction = ctx.regenerationNote
    ? `\n\nThe user regenerated this section with this instruction: "${ctx.regenerationNote}". Follow it closely.`
    : "";

  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system:
      "You are an expert ghostwriter producing publish-ready content for a digital product PDF aimed at " +
      "complete beginners. Write in clean Markdown: use ## for the section heading, short paragraphs, " +
      "bulleted/numbered lists where useful, and wrap 1-3 key takeaways in a blockquote (> ) to act as a " +
      "callout/tip box. Do not repeat content covered by other sections. Do not include a top-level title " +
      "for the whole book, only this section's own heading. Write only the section content, no preamble " +
      "or meta-commentary about what you're doing.",
    messages: [
      {
        role: "user",
        content: `Full product brief:\n${briefBlock(ctx.brief)}\n\nFull outline (for context — do not repeat other sections' content):\n${outlineList}\n\nWrite the complete content for section ${
          ctx.sectionIndex + 1
        }: "${ctx.section.title}" (${ctx.section.summary}).${regenerationInstruction}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return section content.");
  }
  return textBlock.text.trim();
}

// ---------------------------------------------------------------------------
// Design brief generation
// ---------------------------------------------------------------------------

const DESIGN_TOOL = {
  name: "propose_design_brief",
  description: "Choose a cover design direction for this PDF from the curated options provided.",
  input_schema: {
    type: "object" as const,
    properties: {
      paletteId: {
        type: "string" as const,
        enum: PALETTES.map((p) => p.id),
        description: "Best-fit color palette ID for this product's niche and tone.",
      },
      fontPairingId: {
        type: "string" as const,
        enum: FONT_PAIRINGS.map((f) => f.id),
        description: "Best-fit font pairing ID.",
      },
      layoutMood: {
        type: "string" as const,
        enum: LAYOUT_MOODS.map((m) => m.id),
        description: "Best-fit overall layout mood.",
      },
      coverImageQuery: {
        type: "string" as const,
        description: "A 2-4 word English search term for a real stock photo (Pexels) for the cover page.",
      },
      rationale: {
        type: "string" as const,
        description: "One or two sentences explaining the design choice, shown to the user.",
      },
    },
    required: ["paletteId", "fontPairingId", "layoutMood", "coverImageQuery", "rationale"],
  },
};

export async function generateDesignBrief(brief: ProjectBrief): Promise<DesignBrief> {
  const paletteOptions = PALETTES.map((p) => `- ${p.id}: ${p.name}`).join("\n");
  const fontOptions = FONT_PAIRINGS.map((f) => `- ${f.id}: ${f.name}`).join("\n");
  const moodOptions = LAYOUT_MOODS.map((m) => `- ${m.id}: ${m.description}`).join("\n");

  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system:
      "You are a book cover / brand designer choosing a design direction for a digital product PDF. " +
      "You must pick only from the curated palette, font pairing, and layout mood options given — never " +
      "invent new ones.",
    messages: [
      {
        role: "user",
        content: `Product brief:\n${briefBlock(brief)}\n\nAvailable palettes:\n${paletteOptions}\n\nAvailable font pairings:\n${fontOptions}\n\nAvailable layout moods:\n${moodOptions}\n\nPick the best combination for this product.`,
      },
    ],
    tools: [DESIGN_TOOL],
    tool_choice: { type: "tool", name: "propose_design_brief" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a design brief.");
  }

  return toolUse.input as DesignBrief;
}

export function sectionsToSkeleton(sections: Section[]): SkeletonSectionInput[] {
  return sections
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((s) => ({ title: s.title, summary: s.summary }));
}
