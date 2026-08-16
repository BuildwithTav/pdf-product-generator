import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { FONT_PAIRINGS, LAYOUT_MOODS, PALETTES, PRODUCT_FORMATS } from "@/lib/design-presets";
import { ICON_IDS } from "@/lib/icons";
import type { DesignBrief, Section, SkeletonSectionInput } from "@/types/db";

export interface ProjectBrief {
  productName: string;
  niche: string;
  audience: string;
  corePromise: string;
  toneReference?: string | null;
  chapterCountRequested?: number | null;
  problem?: string | null;
  transformation?: string | null;
  format?: string | null;
  purpose?: string | null;
}

function briefBlock(brief: ProjectBrief) {
  const lines = [
    `Product name: ${brief.productName}`,
    `Niche: ${brief.niche}`,
    `Target buyer / audience: ${brief.audience}`,
    `Core promise / outcome: ${brief.corePromise}`,
  ];
  if (brief.problem) lines.push(`Specific problem being solved: ${brief.problem}`);
  if (brief.transformation) lines.push(`Before → after transformation: ${brief.transformation}`);
  if (brief.format) lines.push(`Product format: ${brief.format}`);
  if (brief.purpose) lines.push(`Purpose of this product: ${brief.purpose}`);
  lines.push(
    `Tone reference: ${brief.toneReference?.trim() || "not specified — pick a tone that fits the niche and audience"}`,
    `Requested section count: ${brief.chapterCountRequested ?? "not specified — use your judgement based on scope"}`
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Skeleton generation
// ---------------------------------------------------------------------------

interface SkeletonSectionWithIcon extends SkeletonSectionInput {
  icon: string;
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
            icon: {
              type: "string" as const,
              enum: [...ICON_IDS],
              description: "Best-fit accent icon ID for this section's topic, from the given options.",
            },
          },
          required: ["title", "summary", "icon"],
        },
      },
    },
    required: ["sections"],
  },
};

export async function generateSkeleton(
  brief: ProjectBrief
): Promise<SkeletonSectionWithIcon[]> {
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

  const input = toolUse.input as { sections: SkeletonSectionWithIcon[] };
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
      coverIcon: {
        type: "string" as const,
        enum: [...ICON_IDS],
        description: "Best-fit accent icon ID for the cover page, from the given options.",
      },
      rationale: {
        type: "string" as const,
        description: "One or two sentences explaining the design choice, shown to the user.",
      },
    },
    required: ["paletteId", "fontPairingId", "layoutMood", "coverIcon", "rationale"],
  },
};

export async function generateDesignBrief(brief: ProjectBrief): Promise<DesignBrief> {
  const paletteOptions = PALETTES.map((p) => `- ${p.id}: ${p.name}`).join("\n");
  const fontOptions = FONT_PAIRINGS.map((f) => `- ${f.id}: ${f.name}`).join("\n");
  const moodOptions = LAYOUT_MOODS.map((m) => `- ${m.id}: ${m.description}`).join("\n");
  const iconOptions = ICON_IDS.join(", ");

  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system:
      "You are a book cover / brand designer choosing a design direction for a digital product PDF. " +
      "There is no photography — the design relies entirely on color, typography, a single accent " +
      "icon, and CSS/SVG shapes. You must pick only from the curated palette, font pairing, layout " +
      "mood, and icon options given — never invent new ones.",
    messages: [
      {
        role: "user",
        content: `Product brief:\n${briefBlock(brief)}\n\nAvailable palettes:\n${paletteOptions}\n\nAvailable font pairings:\n${fontOptions}\n\nAvailable layout moods:\n${moodOptions}\n\nAvailable icons:\n${iconOptions}\n\nPick the best combination for this product.`,
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

// ---------------------------------------------------------------------------
// Niche/product idea discovery — for people who don't know what to make yet.
// ---------------------------------------------------------------------------

export interface DiscoveryInput {
  background: string;
  audienceHint?: string;
  interests?: string;
  // Path B: the user already has a rough idea — anchor ideas around it
  // instead of free brainstorming from background alone.
  roughIdea?: string;
  // "Adjust This Idea": a free-text tweak to re-run generation with.
  adjustmentNote?: string;
}

export interface ProductIdea {
  productName: string;
  niche: string;
  audience: string;
  corePromise: string;
  problem: string;
  transformation: string;
  format: string;
  suggestedSize: string;
  rationale: string;
  icon: string;
}

const IDEA_PROPERTIES = {
  productName: { type: "string" as const, description: "A compelling, specific product title." },
  niche: { type: "string" as const, description: "Short niche phrase, e.g. 'Meal planning for busy parents'." },
  audience: {
    type: "string" as const,
    description: "Specific target buyer description — who exactly this is for.",
  },
  corePromise: {
    type: "string" as const,
    description: "One sentence: the concrete outcome the buyer gets.",
  },
  problem: {
    type: "string" as const,
    description: "The specific problem this product solves for that buyer.",
  },
  transformation: {
    type: "string" as const,
    description: "Before → after: what changes for the buyer, in one sentence.",
  },
  format: {
    type: "string" as const,
    enum: PRODUCT_FORMATS.map((f) => f.id),
    description: "Best-fit product format from the given options.",
  },
  suggestedSize: {
    type: "string" as const,
    description: "A short page-count estimate, e.g. '20-30 pages'.",
  },
  rationale: {
    type: "string" as const,
    description: "One sentence on why this fits what the user told us about themselves.",
  },
  icon: {
    type: "string" as const,
    enum: [...ICON_IDS],
    description: "Best-fit accent icon ID for this idea, from the given options.",
  },
};

const IDEA_REQUIRED = [
  "productName",
  "niche",
  "audience",
  "corePromise",
  "problem",
  "transformation",
  "format",
  "suggestedSize",
  "rationale",
  "icon",
];

const IDEAS_TOOL = {
  name: "propose_product_ideas",
  description: "Propose several sellable digital product ideas based on what the user told us about themselves.",
  input_schema: {
    type: "object" as const,
    properties: {
      ideas: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: IDEA_PROPERTIES,
          required: IDEA_REQUIRED,
        },
      },
    },
    required: ["ideas"],
  },
};

export async function generateProductIdeas(input: DiscoveryInput): Promise<ProductIdea[]> {
  const formatOptions = PRODUCT_FORMATS.map((f) => `- ${f.id}: ${f.description}`).join("\n");

  const roughIdeaLine = input.roughIdea?.trim()
    ? `\nRough idea they already have in mind: ${input.roughIdea.trim()}\n\nAnchor your ideas around formalizing and strengthening THIS idea rather than proposing unrelated concepts — fill in the audience, problem, transformation, and format it's missing.`
    : "";
  const adjustmentLine = input.adjustmentNote?.trim()
    ? `\nThe user wants this adjusted: "${input.adjustmentNote.trim()}". Apply this to the ideas.`
    : "";

  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system:
      "You are a digital product strategist helping someone figure out what sellable digital PDF " +
      "product they should make. Base every idea specifically on what they told us about their own " +
      "background and experience; never propose something generic they have no credibility to " +
      "write. Favor niches with a clear, specific buyer and a concrete promise over broad topics.\n\n" +
      `Available product formats:\n${formatOptions}`,
    messages: [
      {
        role: "user",
        content: `What this person told us about themselves:

Background / skills / story: ${input.background}
Who they want to help: ${input.audienceHint?.trim() || "not specified — infer a good fit from their background"}
Topics/interests they'd enjoy writing about: ${input.interests?.trim() || "not specified"}${roughIdeaLine}${adjustmentLine}

Propose 3 distinct digital product ideas for them, ordered best-fit first.`,
      },
    ],
    tools: [IDEAS_TOOL],
    tool_choice: { type: "tool", name: "propose_product_ideas" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return product ideas.");
  }

  const parsed = toolUse.input as { ideas: ProductIdea[] };
  return parsed.ideas;
}

// ---------------------------------------------------------------------------
// Blueprint generation — the strategy review before any outline is written.
// ---------------------------------------------------------------------------

export interface BlueprintInput {
  productName: string;
  niche: string;
  audience: string;
  corePromise: string;
  problem?: string;
  transformation?: string;
  format?: string;
}

export interface Blueprint {
  subtitle: string;
  tone: string;
  purpose: string;
  ctaNextStep: string;
  recommendedLength: string;
  contentsPreview: string[];
}

const BLUEPRINT_TOOL = {
  name: "propose_blueprint",
  description: "Produce the full product strategy blueprint for review before the outline is written.",
  input_schema: {
    type: "object" as const,
    properties: {
      subtitle: { type: "string" as const, description: "A one-line subtitle for the cover, under the title." },
      tone: { type: "string" as const, description: "The writing tone to use, in a few words, e.g. 'warm and direct'." },
      purpose: {
        type: "string" as const,
        description: "What this product is for in the buyer's business/life, one sentence.",
      },
      ctaNextStep: {
        type: "string" as const,
        description: "The single next action the reader should take after finishing this product.",
      },
      recommendedLength: {
        type: "string" as const,
        description: "A short page-count estimate appropriate for this format and scope, e.g. '25-35 pages'.",
      },
      contentsPreview: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "4-7 short bullet points previewing what the product will contain, in order.",
      },
    },
    required: ["subtitle", "tone", "purpose", "ctaNextStep", "recommendedLength", "contentsPreview"],
  },
};

export async function generateBlueprint(input: BlueprintInput): Promise<Blueprint> {
  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system:
      "You are a digital product strategist finalizing the strategy for a product before it's written. " +
      "Be concrete and specific to this exact product — never generic.",
    messages: [
      {
        role: "user",
        content: `Product concept:
Title: ${input.productName}
Niche: ${input.niche}
Audience: ${input.audience}
Core promise: ${input.corePromise}
${input.problem ? `Problem: ${input.problem}\n` : ""}${input.transformation ? `Transformation: ${input.transformation}\n` : ""}${input.format ? `Format: ${input.format}\n` : ""}
Produce the blueprint.`,
      },
    ],
    tools: [BLUEPRINT_TOOL],
    tool_choice: { type: "tool", name: "propose_blueprint" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a blueprint.");
  }

  return toolUse.input as Blueprint;
}
