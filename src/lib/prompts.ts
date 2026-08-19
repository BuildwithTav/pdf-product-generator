import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { FONT_PAIRINGS, LAYOUT_MOODS, PALETTES, PRODUCT_FORMATS } from "@/lib/design-presets";
import { ICON_IDS } from "@/lib/icons";
import { sanitizeGeneratedText, sanitizeGeneratedTextArray } from "@/lib/text";
import type { DesignBrief, Section, SkeletonSectionInput } from "@/types/db";

// Appended to every generation system prompt. Em dashes are stripped in code
// as a hard guarantee, but the instruction still matters: it stops Claude
// reaching for an en dash or run-on comma splice as a substitute, and keeps
// general punctuation (terminal periods, colons, no doubled punctuation)
// clean at the source instead of relying on the code-level cleanup alone.
// Also holds the plain-language rule, added after a real product title
// ("Beat the Bots: The ATS Survival Playbook") shipped an unexplained
// acronym nobody outside recruiting would recognize — titles, subtitles,
// and copy all need to survive contact with a reader who isn't already an
// expert in the topic, especially since this app exists so non-experts can
// build products in niches they may only loosely know.
const PUNCTUATION_RULE =
  "Never use an em dash (—) anywhere in your output: use a comma, period, colon, or parentheses " +
  "instead, whichever fits the sentence. Use correct, precise punctuation throughout: proper commas, " +
  "colons, and terminal periods; no doubled or missing punctuation; no comma splices.\n\n" +
  "Write in plain, immediately understandable language, roughly the reading level of a smart " +
  "12-year-old. Never use an acronym, abbreviation, or industry/insider term without spelling out " +
  "what it means the first time, especially in a title, subtitle, or heading, since those are read " +
  "in isolation before any explanation. If a simpler everyday word says the same thing, use it. " +
  "This applies most to anything a reader sees before they've read the surrounding context: titles, " +
  "subtitles, headings, and short descriptions.";

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
    max_tokens: 4096,
    system: [
      {
        type: "text" as const,
        text:
          "You are an expert instructional designer and ghostwriter who structures digital products " +
          "(ebooks, guides, workbooks) for beginners with no design or writing skill. You produce clear, " +
          "sellable, well-scoped outlines. Sections should build on each other logically and cover the " +
          "promise completely without padding or redundancy.\n\n" +
          PUNCTUATION_RULE,
        // This system prompt is identical on every call — caching it means
        // repeat outline generations reuse it at ~10% of the input cost
        // instead of paying full price every time.
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Propose a chapter/section structure for this digital product:\n\n${briefBlock(
          brief
        )}\n\nThis is a short, focused guide (5-7 pages total, clear and to the point, no waffle), not a ` +
          `long book, so keep the structure tight. If a section count was requested, use exactly that many ` +
          `sections. Otherwise choose the number that best fits the scope (typically 4-6) — fewer, ` +
          `substantial sections beat many thin ones.`,
      },
    ],
    tools: [SKELETON_TOOL],
    tool_choice: { type: "tool", name: "propose_skeleton" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a skeleton.");
  }

  // Forced tool_choice still doesn't guarantee schema-perfect output (nor
  // that generation didn't get cut off mid-JSON at the token limit) — never
  // trust it with a blind cast straight into .map(). Validate and drop
  // anything malformed instead of crashing the whole outline step.
  const rawInput = toolUse.input as { sections?: unknown };
  const rawSections = Array.isArray(rawInput.sections) ? rawInput.sections : [];
  const sections = rawSections.filter(
    (s): s is SkeletonSectionWithIcon =>
      Boolean(s) &&
      typeof (s as { title?: unknown }).title === "string" &&
      ((s as { title: string }).title.trim().length > 0) &&
      typeof (s as { summary?: unknown }).summary === "string" &&
      typeof (s as { icon?: unknown }).icon === "string"
  );

  if (sections.length === 0) {
    throw new Error("Claude did not return a usable skeleton. Try generating the outline again.");
  }

  return sections.map((s) => ({
    ...s,
    title: sanitizeGeneratedText(s.title),
    summary: sanitizeGeneratedText(s.summary),
  }));
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

// The whole product should land around 5-7 printed pages, roughly a quarter
// of what this app used to target, since a shorter guide focused on only
// the vital information is more useful to a buyer than a padded one. ~450
// words is a reasonable estimate for one page of this template's body text
// once cover and TOC (roughly 2 pages) are accounted for; spread that
// budget evenly across sections and clamp so very short or very long
// outlines don't produce absurd per-section targets.
function targetWordCount(sectionCount: number): number {
  const contentPages = 6;
  const wordsPerPage = 450;
  const perSection = Math.round((contentPages * wordsPerPage) / Math.max(sectionCount, 1));
  return Math.min(450, Math.max(150, perSection));
}

export async function generateSectionContent(ctx: SectionGenerationContext): Promise<string> {
  const outlineList = ctx.fullSkeleton
    .map((s, i) => `${i + 1}. ${s.title} — ${s.summary} (anchor: #section-${i})`)
    .join("\n");

  const regenerationInstruction = ctx.regenerationNote
    ? `\n\nThe user regenerated this section with this instruction: "${ctx.regenerationNote}". Follow it closely.`
    : "";

  const wordTarget = targetWordCount(ctx.fullSkeleton.length);

  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text" as const,
        // Identical across every chapter of the same project (wordTarget
        // only depends on section count) — caching it means writing a
        // whole multi-chapter PDF in one sitting reuses this prefix at
        // ~10% cost instead of paying full price per chapter.
        cache_control: { type: "ephemeral" as const },
        text:
      "You are an expert ghostwriter and workbook designer producing publish-ready content for a digital " +
      "product PDF aimed at complete beginners. The whole product should read as a short, tight, " +
      `professional 5-7 page PDF — aim for roughly ${wordTarget} words for this section, not more. Write ` +
      "clear, direct information with no waffle: explain what the buyer needs plainly and get straight " +
      "to it, rather than warming up with scene-setting or restating the obvious before making a point. " +
      "Prioritize actionable substance (steps, frameworks, examples) over padding; cut generic filler " +
      "before you'd cut a concrete example.\n\n" +
      "Formatting rules, in clean Markdown:\n" +
      "- Use ## for this section's own heading only (never a top-level book title), and ### for internal " +
      "subheadings if the section has more than one distinct part.\n" +
      "- Wrap 1-3 key takeaways per section in a blockquote (> ) as a callout/tip box.\n" +
      "- Whenever the content is a tracker, comparison, scoring rubric, or anything with rows and columns, " +
      "use a real Markdown table (| col | col |) — never fake columns with plain text or dashes.\n" +
      "- Whenever the content is a checklist, a daily/weekly tracker, or any step meant to be checked off, " +
      "use Markdown task list syntax (- [ ] item) — never plain bullet text for something meant to be " +
      "checked off by hand.\n" +
      "- For reflection prompts or fill-in-the-blank exercises, use a two-column table with the prompt in " +
      "the left column and the right column left blank (a single non-breaking space) so it renders as a " +
      "clean printable box to write in — never use underscores or blank lines for this.\n" +
      "- If this section includes a self-scored quiz, rubric, or assessment with distinct result " +
      "categories, follow the scoring table with a short 'Your path from here' note that routes each " +
      "category to specific chapters by name from the outline below (e.g. which chapters to read in full " +
      "vs. skim vs. skip ahead to) — this is a static, pre-written branch the reader follows themselves, " +
      "not something that changes automatically, so write it as direct instructions ('If you scored X, " +
      "start with Chapter 2 before moving on').\n" +
      "- Any time you reference another chapter by name (including in a 'your path from here' note), " +
      "write it as a Markdown link using that chapter's exact anchor from the outline below, e.g. " +
      "[Chapter 2: Building Trust](#section-1). The reader can tap it to jump straight there when " +
      "reading digitally, so never reference a chapter as plain unlinked text.\n" +
      "- Do not repeat content covered by other sections. Write only the section content, no preamble or " +
      "meta-commentary about what you're doing.\n\n" +
      PUNCTUATION_RULE,
      },
    ],
    messages: [
      {
        role: "user",
        content: `Full product brief:\n${briefBlock(ctx.brief)}\n\nFull outline (for context, do not repeat other sections' content):\n${outlineList}\n\nWrite the complete content for section ${
          ctx.sectionIndex + 1
        }: "${ctx.section.title}" (${ctx.section.summary}).${regenerationInstruction}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return section content.");
  }
  return sanitizeGeneratedText(textBlock.text.trim());
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
    system: [
      {
        type: "text" as const,
        text:
          "You are a book cover / brand designer choosing a design direction for a digital product PDF. " +
          "There is no photography: the design relies entirely on color, typography, a single accent " +
          "icon, and CSS/SVG shapes. You must pick only from the curated palette, font pairing, layout " +
          "mood, and icon options given, never invent new ones.\n\n" +
          PUNCTUATION_RULE,
        cache_control: { type: "ephemeral" as const },
      },
    ],
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

  const brief_ = toolUse.input as DesignBrief;
  return { ...brief_, rationale: sanitizeGeneratedText(brief_.rationale) };
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
  // Real pain-point research from runResearch(), when available, grounds
  // idea generation in genuine buyer language instead of just background.
  researchFindings?: ResearchResult;
  // "Surprise me": no personal background given, find whatever pain point
  // is genuinely trending right now instead of anchoring to credibility.
  openEnded?: boolean;
  // Set once the user has picked a specific topic from the trend scan —
  // anchors the openEnded research/ideas calls to that topic instead of
  // searching for literally anything.
  openEndedTopic?: string;
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
  productName: {
    type: "string" as const,
    description:
      "A compelling, specific product title in plain everyday language. Never an unexplained acronym or industry term on its own, e.g. write \"beat the resume-screening robots\" not \"beat the ATS\".",
  },
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
    description: "A short page-count estimate, e.g. '5-7 pages'.",
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

const PRODUCT_IDEA_STRING_FIELDS: (keyof ProductIdea)[] = [
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

function isValidProductIdea(idea: unknown): idea is ProductIdea {
  if (!idea || typeof idea !== "object") return false;
  return PRODUCT_IDEA_STRING_FIELDS.every((field) => {
    const value = (idea as Record<string, unknown>)[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

async function callIdeasTool(system: string, userContent: string): Promise<ProductIdea[]> {
  const message = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    // Both callers' system prompts are static per-branch (open vs.
    // topic-anchored) — cached so "Show me alternatives"/"Adjust this
    // idea" re-calls, which reuse the exact same system text, aren't
    // billed full price again.
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: userContent }],
    tools: [IDEAS_TOOL],
    tool_choice: { type: "tool", name: "propose_product_ideas" },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return product ideas.");
  }

  // Same lesson as generateSkeleton: forced tool_choice still doesn't
  // guarantee every "required" field survives, so validate before trusting
  // any of this rather than crashing the whole ideas step on one bad entry.
  const rawInput = toolUse.input as { ideas?: unknown };
  const rawIdeas = Array.isArray(rawInput.ideas) ? rawInput.ideas : [];
  const validIdeas = rawIdeas.filter(isValidProductIdea);

  if (validIdeas.length === 0) {
    throw new Error("Claude did not return usable product ideas. Try again.");
  }

  return validIdeas.map((idea) => ({
    ...idea,
    productName: sanitizeGeneratedText(idea.productName),
    niche: sanitizeGeneratedText(idea.niche),
    audience: sanitizeGeneratedText(idea.audience),
    corePromise: sanitizeGeneratedText(idea.corePromise),
    problem: sanitizeGeneratedText(idea.problem),
    transformation: sanitizeGeneratedText(idea.transformation),
    suggestedSize: sanitizeGeneratedText(idea.suggestedSize),
    rationale: sanitizeGeneratedText(idea.rationale),
  }));
}

export async function generateProductIdeas(input: DiscoveryInput): Promise<ProductIdea[]> {
  const formatOptions = PRODUCT_FORMATS.map((f) => `- ${f.id}: ${f.description}`).join("\n");

  const adjustmentLine = input.adjustmentNote?.trim()
    ? `\nThe user wants this adjusted: "${input.adjustmentNote.trim()}". Apply this to the ideas.`
    : "";
  const researchLine = input.researchFindings?.findings.length
    ? `\nReal research on this niche, from web search of Reddit, Quora, and forums:\n${
        input.researchFindings.summary
      }\n${input.researchFindings.findings
        .map((f) => `- ${f.painPoint}${f.quote ? ` ("${f.quote}")` : ""} [${f.source}]`)
        .join("\n")}\n\nGround your ideas in these specific pain points and desires where they fit, rather than inferring only from the background above.`
    : "";

  if (input.openEnded) {
    const directionLine = input.openEndedTopic
      ? `The chosen trending topic, which every idea MUST be built around, with no substitution: ${input.openEndedTopic}`
      : "Find a sellable digital product opportunity with no assigned direction.";
    const countInstruction = input.openEndedTopic
      ? "Propose 3 distinct product angles on this topic (e.g. different formats, different specific sub-problems, or different buyer segments), ordered best-fit first."
      : "Propose 3 distinct digital product ideas, ordered best-fit first, each in a different-enough niche or topic that they're genuinely 3 separate opportunities rather than 3 variations on one theme.";

    const openEndedSystem = input.openEndedTopic
      ? "You are a digital product strategist. The user has already picked one specific trending " +
        "topic to build a product around — your only job is to develop 3 distinct, sellable product " +
        "angles WITHIN that exact topic (different formats, sub-problems, or buyer segments), not to " +
        "find or substitute a different topic, even one you think is more current or promising. Every " +
        "idea you propose must clearly be about the topic given below, not a tangent or a different " +
        "trending story. Favor a clear, specific buyer and a concrete promise over broad framing.\n\n" +
        `Available product formats:\n${formatOptions}\n\n${PUNCTUATION_RULE}`
      : "You are a digital product strategist scouting for a sellable digital PDF product idea with " +
        "no assigned niche. There is no personal background to anchor to here, so prioritize genuine " +
        "current relevance, a searchable and actively trending pain point, and a buyer who would " +
        "credibly trust a well-written guide on it. Favor niches with a clear, specific buyer and a " +
        "concrete promise over broad topics.\n\n" +
        `Available product formats:\n${formatOptions}\n\n${PUNCTUATION_RULE}`;

    return callIdeasTool(
      openEndedSystem,
      `${directionLine}${researchLine}${adjustmentLine}\n\n${countInstruction}`
    );
  }

  const roughIdeaLine = input.roughIdea?.trim()
    ? `\nRough idea they already have in mind: ${input.roughIdea.trim()}\n\nAnchor your ideas around formalizing and strengthening THIS idea rather than proposing unrelated concepts. Fill in the audience, problem, transformation, and format it's missing.`
    : "";

  return callIdeasTool(
    "You are a digital product strategist helping someone figure out what sellable digital PDF " +
      "product they should make. Base every idea specifically on what they told us about their own " +
      "background and experience; never propose something generic they have no credibility to " +
      "write. Favor niches with a clear, specific buyer and a concrete promise over broad topics. " +
      "When real research findings are provided, treat them as the strongest signal available and " +
      "anchor ideas in the specific pain points they describe.\n\n" +
      `Available product formats:\n${formatOptions}\n\n${PUNCTUATION_RULE}`,
    `What this person told us about themselves:

Background / skills / story: ${input.background}
Who they want to help: ${input.audienceHint?.trim() || "not specified, infer a good fit from their background"}
Topics/interests they'd enjoy writing about: ${input.interests?.trim() || "not specified"}${roughIdeaLine}${adjustmentLine}${researchLine}

Propose 3 distinct digital product ideas for them, ordered best-fit first.`
  );
}

// ---------------------------------------------------------------------------
// Niche research — real pain-point language via web search, grounding the
// ideas above in genuine buyer language instead of just self-reported
// background. Streams live status while it works.
// ---------------------------------------------------------------------------

export interface ResearchFinding {
  painPoint: string;
  quote?: string;
  source: string;
  url?: string;
}

export interface ResearchResult {
  summary: string;
  findings: ResearchFinding[];
}

export type ResearchStreamEvent =
  | { type: "status"; message: string }
  | { type: "result"; result: ResearchResult }
  | { type: "error"; message: string };

const RESEARCH_TOOL = {
  name: "propose_research",
  description:
    "Report the pain-point research findings once you have searched enough real sources to ground " +
    "product ideas in genuine buyer language. Call this exactly once, after your searches, as the " +
    "last thing you do.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string" as const,
        description: "1-3 sentence synthesis of what you found.",
      },
      findings: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            painPoint: {
              type: "string" as const,
              description: "A specific, concrete pain point or desire found in real discussion, in your own words.",
            },
            quote: {
              type: "string" as const,
              description:
                "A short paraphrase or representative snippet illustrating this pain point. Do not fabricate a verbatim quote you didn't see.",
            },
            source: {
              type: "string" as const,
              description: "The site/domain this came from, e.g. reddit.com.",
            },
            url: {
              type: "string" as const,
              description: "The specific URL this finding came from, if available.",
            },
          },
          required: ["painPoint", "source"],
        },
        description: "3-8 distinct pain points/desires found via search, each traceable to a real source.",
      },
    },
    required: ["summary", "findings"],
  },
};

function researchSystemPrompt() {
  return (
    "You are a market researcher gathering genuine pain-point language for a digital product " +
    "strategist. Use web_search to find how real people describe their problems in this niche on " +
    "Reddit, Quora, forums, and reviews, in their own words, not marketing copy.\n\n" +
    "Search first: run 2 to 6 distinct web_search calls, varying your phrasing and trying " +
    "site-specific queries (e.g. site:reddit.com <topic>) where useful. Then, once you have enough " +
    "to work with, call propose_research exactly once as the last thing you do, summarizing what " +
    "you found. Never end your turn without calling propose_research, even if search results were " +
    "thin, in which case report that honestly with fewer findings.\n\n" +
    PUNCTUATION_RULE
  );
}

// Only ever called for the background-grounded discover/build paths now —
// "Surprise me" generates ideas directly from the trend scan's own findings
// without a second research pass (see generateProductIdeas' openEnded
// branch), so there's no openEnded case to handle here.
function researchUserMessage(input: DiscoveryInput): string {
  return `What this person told us about themselves:

Background / skills / story: ${input.background}
Who they want to help: ${input.audienceHint?.trim() || "not specified, infer a good fit from their background"}
Topics/interests they'd enjoy writing about: ${input.interests?.trim() || "not specified"}${
    input.roughIdea?.trim() ? `\nRough idea they already have in mind: ${input.roughIdea.trim()}` : ""
  }

Research the real pain points and desires of people in this space.`;
}

// Tool schemas aren't strictly enforced server-side (especially with
// tool_choice left as "auto" so web_search stays available), so Claude's
// actual propose_research call can omit a field the schema marks required.
// Never trust it with a blind `as ResearchResult` cast — normalize it into
// a shape guaranteed to satisfy IdeasSchema downstream, dropping any
// finding that's missing what it needs rather than letting a malformed
// entry reach the client and fail validation there.
function normalizeResearchResult(raw: unknown): ResearchResult {
  const obj = (raw ?? {}) as { summary?: unknown; findings?: unknown };
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];
  const findings: ResearchFinding[] = rawFindings
    .filter(
      (f): f is { painPoint: string; source: string; quote?: unknown; url?: unknown } =>
        Boolean(f) &&
        typeof (f as { painPoint?: unknown }).painPoint === "string" &&
        ((f as { painPoint: string }).painPoint.trim().length > 0) &&
        typeof (f as { source?: unknown }).source === "string" &&
        ((f as { source: string }).source.trim().length > 0)
    )
    .map((f) => ({
      painPoint: f.painPoint,
      source: f.source,
      quote: typeof f.quote === "string" ? f.quote : undefined,
      url: typeof f.url === "string" ? f.url : undefined,
    }));
  return { summary, findings };
}

function sanitizeResearchResult(result: ResearchResult): ResearchResult {
  return {
    summary: sanitizeGeneratedText(result.summary),
    findings: result.findings.map((f) => ({
      ...f,
      painPoint: sanitizeGeneratedText(f.painPoint),
      quote: f.quote ? sanitizeGeneratedText(f.quote) : f.quote,
    })),
  };
}

// Shared between runResearch and runTrendScan — both stream a web_search-
// enabled call and want the same "Searching for X... / Reading results
// from Y..." status mapping. Returns the callback to pass into
// stream.on("contentBlock", ...).
function searchStatusHandler(onStatus: (message: string) => void) {
  return (block: Anthropic.ContentBlock) => {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      const rawInput = block.input as { query?: unknown };
      const query = typeof rawInput.query === "string" ? rawInput.query : "the topic";
      onStatus(sanitizeGeneratedText(`Searching for "${query}"...`));
      return;
    }
    if (block.type === "web_search_tool_result") {
      if (Array.isArray(block.content)) {
        const hosts = Array.from(
          new Set(
            block.content
              .map((r) => {
                try {
                  return new URL(r.url).hostname.replace(/^www\./, "");
                } catch {
                  return null;
                }
              })
              .filter((h): h is string => Boolean(h))
          )
        );
        onStatus(hosts.length ? `Reading results from ${hosts.join(", ")}...` : "Reading search results...");
      } else {
        onStatus("That search didn't return results, trying a different angle...");
      }
    }
  };
}

export async function runResearch(
  input: DiscoveryInput,
  onEvent: (event: ResearchStreamEvent) => void
): Promise<ResearchResult> {
  const stream = anthropic().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    // Static across every call — caching this matters most here of
    // anywhere in this file: a multi-search call re-sends its full growing
    // context (including this system prompt) on every internal search
    // turn, so an uncached search-heavy call pays full system-prompt price
    // repeatedly within itself, not just once.
    system: [{ type: "text" as const, text: researchSystemPrompt(), cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: researchUserMessage(input) }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }, RESEARCH_TOOL],
    // tool_choice intentionally omitted (defaults to "auto") — Claude needs
    // freedom to call web_search first; forcing propose_research immediately
    // would prevent that.
  });

  stream.on("contentBlock", searchStatusHandler((message) => onEvent({ type: "status", message })));

  const finalMessage = await stream.finalMessage();
  let toolUse = finalMessage.content.find(
    (b) => b.type === "tool_use" && b.name === "propose_research"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    // Claude finished without calling propose_research (tool_choice wasn't
    // forced, since it needed freedom to search first). One forced retry,
    // as a fresh single-turn call rather than replaying the raw response
    // content blocks back as request params (their types aren't guaranteed
    // to match), to close things out instead of failing the whole step.
    onEvent({ type: "status", message: "Finalizing findings..." });
    const priorText = finalMessage.content
      .filter((b): b is Extract<typeof finalMessage.content[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    const retry = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: [{ type: "text" as const, text: researchSystemPrompt(), cache_control: { type: "ephemeral" as const } }],
      messages: [
        {
          role: "user",
          content: `${researchUserMessage(input)}${
            priorText ? `\n\nYou began researching and noted: ${priorText}` : ""
          }\n\nCall propose_research now, summarizing your findings, or with an empty findings array if nothing useful turned up.`,
        },
      ],
      tools: [RESEARCH_TOOL],
      tool_choice: { type: "tool", name: "propose_research" },
    });
    toolUse = retry.content.find((b) => b.type === "tool_use");
  }

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return research findings.");
  }

  return sanitizeResearchResult(normalizeResearchResult(toolUse.input));
}

// ---------------------------------------------------------------------------
// Trend scan — the first phase of "Surprise me": find genuinely trending
// pain points from the past week, before the user picks one to
// anchor research/ideas generation to (via DiscoveryInput.openEndedTopic).
// ---------------------------------------------------------------------------

export const TREND_CATEGORIES = [
  "parenting",
  "pets",
  "finance",
  "health_fitness",
  "relationships",
  "career_work",
  "hobbies",
  "home_lifestyle",
  "technology",
] as const;

export type TrendCategory = (typeof TREND_CATEGORIES)[number];

export interface TrendingTopic {
  title: string;
  description: string;
  whyTrending: string;
  category: TrendCategory;
}

export type TrendScanStreamEvent =
  | { type: "status"; message: string }
  | { type: "result"; result: TrendingTopic[] }
  | { type: "error"; message: string };

const TREND_SCAN_TOOL = {
  name: "propose_trending_topics",
  description:
    "Report the top trending pain points/topics found, once your searches are complete. Call this " +
    "exactly once, with exactly 8 topics, as the last thing you do.",
  input_schema: {
    type: "object" as const,
    properties: {
      topics: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: {
              type: "string" as const,
              description: "A short, specific name for this trending topic or pain point.",
            },
            description: {
              type: "string" as const,
              description: "1-2 sentences on what this is and who's affected.",
            },
            whyTrending: {
              type: "string" as const,
              description: "One sentence on why this is trending right now, e.g. what's driving the recent discussion.",
            },
            category: {
              type: "string" as const,
              enum: [...TREND_CATEGORIES],
              description: "The life category this topic belongs to.",
            },
          },
          required: ["title", "description", "whyTrending", "category"],
        },
        description: "Exactly 8 distinct trending topics, ordered strongest first, chosen purely on genuine trending strength.",
      },
    },
    required: ["topics"],
  },
};

function trendScanSystemPrompt(): string {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateContext = `Today's date is ${today.toISOString().slice(0, 10)}. Focus on discussion from the past 7 days (since ${sevenDaysAgo.toISOString().slice(0, 10)}).`;

  return (
    "You are a trend scout finding genuinely trending pain points and desires, for someone who " +
    "wants to build a sellable digital PDF guide around whatever is most current right now.\n\n" +
    `${dateContext}\n\n` +
    "IMPORTANT — avoid a known failure mode: when asked to find 'trending pain points,' you tend to " +
    "default to the same handful of generic seasonal guesses (back-to-school stress, tariffs/prices, " +
    "general venting, AI-and-jobs anxiety) almost every time, regardless of what's actually happening " +
    "this week, because those are common associations from training rather than something you " +
    "verified. Do not let that happen here. Treat those exact topics as ones you must actively " +
    "distrust and confirm with real, specific evidence before including — never include one just " +
    "because it feels like a safe seasonal default.\n\n" +
    "You have a budget of at most 4 searches total, so be deliberate, not exhaustive. Follow this " +
    "order, not the reverse:\n" +
    "1. Spend 1-2 searches on broad, general current events and news from the past 7 days (e.g. what " +
    "happened this week, current news roundups) to find a couple of SPECIFIC real stories, releases, " +
    "price changes, or incidents — not themes you already assumed, but things you can name and cite.\n" +
    "2. Spend your remaining 2-3 searches on site:reddit.com and site:quora.com queries asking how " +
    "real people are specifically reacting to what you found, or, if step 1 didn't turn up much, on a " +
    "life area that rarely makes general news (pets, hobbies, relationships, home life, personal " +
    "finance, physical/mental health). Base these queries on what you actually found in step 1 or are " +
    "actively curious about, never on a stock phrase you'd reach for regardless of the week.\n" +
    "3. Only after that research, let the topics emerge from what you actually found repeated across " +
    "threads/reviews/questions, and classify each into a category at that point, not before.\n\n" +
    "Skip generic blogs, brand sites, and news aggregators as your primary source for the final " +
    "topics — they're only useful in step 1 to find real events, not as evidence of genuine " +
    "discussion; the actual pain-point evidence must come from Reddit, Quora, or reviews.\n\n" +
    "Report the 8 strongest distinct topics from that research (a wider spread than just the top " +
    "handful helps different people land on different products instead of everyone converging on the " +
    "same one) — regardless of what category they land in or how many share a category: don't force " +
    "artificial variety into the result if the real signal is concentrated. Within that, favor topics " +
    "people would actually pay for a structured guide on (a specific buyer with a clear before/after) " +
    "over topics that are really just current-events explainers nobody would pay to read.\n\n" +
    "Then call propose_trending_topics exactly once, with exactly 8 topics, ordered strongest " +
    "first. Never end your turn without calling it.\n\n" +
    PUNCTUATION_RULE
  );
}

const TREND_CATEGORY_SET = new Set<string>(TREND_CATEGORIES);

function normalizeTrendingTopics(raw: unknown): TrendingTopic[] {
  const obj = (raw ?? {}) as { topics?: unknown };
  const rawTopics = Array.isArray(obj.topics) ? obj.topics : [];
  return rawTopics
    .filter(
      (t): t is { title: string; description: string; whyTrending?: unknown; category?: unknown } =>
        Boolean(t) &&
        typeof (t as { title?: unknown }).title === "string" &&
        ((t as { title: string }).title.trim().length > 0) &&
        typeof (t as { description?: unknown }).description === "string" &&
        ((t as { description: string }).description.trim().length > 0)
    )
    .slice(0, 8)
    .map((t) => ({
      title: sanitizeGeneratedText(t.title),
      description: sanitizeGeneratedText(t.description),
      whyTrending: sanitizeGeneratedText(typeof t.whyTrending === "string" ? t.whyTrending : ""),
      category: (typeof t.category === "string" && TREND_CATEGORY_SET.has(t.category)
        ? t.category
        : "home_lifestyle") as TrendCategory,
    }));
}

export async function runTrendScan(
  onEvent: (event: TrendScanStreamEvent) => void
): Promise<TrendingTopic[]> {
  const stream = anthropic().messages.stream({
    model: CLAUDE_MODEL,
    // The system prompt caps the model at 4 deliberate searches (not
    // exhaustive exploration), so this budget only needs to cover that
    // plus reasoning before the tool call — kept a bit above the bare
    // minimum so a normal run doesn't clip mid-search into the blind
    // retry below, without paying for headroom searches can't use anyway.
    max_tokens: 4096,
    // Static for the whole day (only the embedded date changes daily) —
    // same reasoning as runResearch: a multi-search call re-pays this
    // prefix on every internal search turn if it isn't cached.
    system: [{ type: "text" as const, text: trendScanSystemPrompt(), cache_control: { type: "ephemeral" as const } }],
    messages: [
      {
        role: "user",
        content:
          "Find the top 8 trending pain points or desires from the past 7 days that would make good " +
          "sellable digital PDF guide topics.",
      },
    ],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }, TREND_SCAN_TOOL],
    // tool_choice intentionally omitted (defaults to "auto"), same reason as runResearch.
  });

  stream.on("contentBlock", searchStatusHandler((message) => onEvent({ type: "status", message })));

  const finalMessage = await stream.finalMessage();
  let toolUse = finalMessage.content.find(
    (b) => b.type === "tool_use" && b.name === "propose_trending_topics"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    // Same forced-retry fallback as runResearch — and, like that one, carry
    // forward whatever the first call already found instead of asking blind.
    // Without this, a retry triggered by running out of budget mid-search
    // has nothing to work with and reliably produces empty/unusable topics.
    onEvent({ type: "status", message: "Finalizing trending topics..." });
    const priorText = finalMessage.content
      .filter((b): b is Extract<typeof finalMessage.content[number], { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    const retry = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3072,
      system: [{ type: "text" as const, text: trendScanSystemPrompt(), cache_control: { type: "ephemeral" as const } }],
      messages: [
        {
          role: "user",
          content:
            "Find the top 8 trending pain points or desires from the past 7 days that would make good " +
            "sellable digital PDF guide topics.",
        },
        {
          role: "assistant",
          content: priorText || "I've been researching trending pain points.",
        },
        {
          role: "user",
          content:
            "Call propose_trending_topics now with the 8 best trending topics you can identify from " +
            "what you've found so far, even without further searching. Never return an empty list.",
        },
      ],
      tools: [TREND_SCAN_TOOL],
      tool_choice: { type: "tool", name: "propose_trending_topics" },
    });
    toolUse = retry.content.find((b) => b.type === "tool_use");
  }

  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return trending topics.");
  }

  const topics = normalizeTrendingTopics(toolUse.input);
  if (topics.length === 0) {
    throw new Error("Claude did not return usable trending topics. Try again.");
  }

  return topics;
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
        description: "A short page-count estimate appropriate for this format and scope, e.g. '5-7 pages'.",
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
    system: [
      {
        type: "text" as const,
        text:
          "You are a digital product strategist finalizing the strategy for a product before it's written. " +
          "Be concrete and specific to this exact product, never generic.\n\n" +
          PUNCTUATION_RULE,
        cache_control: { type: "ephemeral" as const },
      },
    ],
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

  const blueprint = toolUse.input as Blueprint;
  return {
    ...blueprint,
    subtitle: sanitizeGeneratedText(blueprint.subtitle),
    tone: sanitizeGeneratedText(blueprint.tone),
    purpose: sanitizeGeneratedText(blueprint.purpose),
    ctaNextStep: sanitizeGeneratedText(blueprint.ctaNextStep),
    recommendedLength: sanitizeGeneratedText(blueprint.recommendedLength),
    contentsPreview: sanitizeGeneratedTextArray(blueprint.contentsPreview),
  };
}
