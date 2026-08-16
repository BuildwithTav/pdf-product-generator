export type ProjectStatus = "idea" | "blueprint" | "writing" | "ready_to_design" | "complete";

export type SectionStatus = "pending" | "generating" | "generated" | "approved";

export type EntryPath = "discover" | "build" | "fast_track";

export interface DesignPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface DesignFontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  headingGoogleFont: string;
  bodyGoogleFont: string;
}

export type LayoutMood = "minimal" | "bold" | "editorial";

export interface DesignBrief {
  paletteId: string;
  fontPairingId: string;
  layoutMood: LayoutMood;
  coverIcon: string;
  rationale?: string;
}

export interface Project {
  id: string;
  user_id: string;
  product_name: string;
  niche: string;
  audience: string;
  core_promise: string;
  tone_reference: string | null;
  chapter_count_requested: number | null;
  status: ProjectStatus;
  design_brief: DesignBrief | null;
  subtitle: string | null;
  author_name: string | null;
  path: EntryPath | null;
  problem: string | null;
  transformation: string | null;
  format: string | null;
  purpose: string | null;
  cta_next_step: string | null;
  blueprint_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  summary: string;
  content: string | null;
  icon: string | null;
  status: SectionStatus;
  regenerate_count: number;
  created_at: string;
  updated_at: string;
}

export interface SkeletonSectionInput {
  title: string;
  summary: string;
}

export interface BusinessProfile {
  id: string;
  background: string | null;
  audience_hint: string | null;
  interests: string | null;
  updated_at: string;
}
