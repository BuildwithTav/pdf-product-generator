import type { DesignFontPairing, DesignPalette, LayoutMood } from "@/types/db";

// Curated design options. Claude picks an ID from these lists when it
// generates a design brief; the UI exposes the same lists as a palette
// picker / font dropdown / layout selector so a user can override the
// AI's pick without ever touching raw color values or arbitrary fonts.

export const PALETTES: DesignPalette[] = [
  {
    id: "ink-slate",
    name: "Ink & Slate",
    primary: "#1B1E2B",
    secondary: "#4A5068",
    accent: "#E8A33D",
    background: "#FFFFFF",
    surface: "#F4F4F7",
    text: "#1B1E2B",
    muted: "#6B7086",
  },
  {
    id: "sage-cream",
    name: "Sage & Cream",
    primary: "#3F5D4E",
    secondary: "#8AA290",
    accent: "#D97D54",
    background: "#FBF8F1",
    surface: "#F0EBDD",
    text: "#26332B",
    muted: "#748577",
  },
  {
    id: "midnight-gold",
    name: "Midnight & Gold",
    primary: "#12131A",
    secondary: "#2A2C3D",
    accent: "#D4AF37",
    background: "#0F1016",
    surface: "#1B1D29",
    text: "#F4F2EA",
    muted: "#9A9CAE",
  },
  {
    id: "coral-clay",
    name: "Coral & Clay",
    primary: "#B94B3B",
    secondary: "#E38B6E",
    accent: "#2F4858",
    background: "#FFF9F5",
    surface: "#FBEAE1",
    text: "#3A2620",
    muted: "#8A6D62",
  },
  {
    id: "azure-mist",
    name: "Azure & Mist",
    primary: "#1E4A72",
    secondary: "#5A85AB",
    accent: "#F2A65A",
    background: "#F7FAFC",
    surface: "#E9F1F7",
    text: "#132B3E",
    muted: "#5F7688",
  },
  {
    id: "plum-blush",
    name: "Plum & Blush",
    primary: "#4B2545",
    secondary: "#8A5A83",
    accent: "#F0A8A0",
    background: "#FFFBFA",
    surface: "#F7ECF4",
    text: "#33162E",
    muted: "#8A7385",
  },
  {
    id: "forest-mono",
    name: "Forest Mono",
    primary: "#16342A",
    secondary: "#3D6354",
    accent: "#9BC53D",
    background: "#FAFAF7",
    surface: "#EEF2E9",
    text: "#16221B",
    muted: "#63705F",
  },
  {
    id: "charcoal-citrus",
    name: "Charcoal & Citrus",
    primary: "#252525",
    secondary: "#565656",
    accent: "#F2C14E",
    background: "#FFFFFF",
    surface: "#F5F5F0",
    text: "#1A1A1A",
    muted: "#7A7A7A",
  },
];

export const FONT_PAIRINGS: DesignFontPairing[] = [
  {
    id: "playfair-inter",
    name: "Playfair Display + Inter",
    heading: "Playfair Display",
    body: "Inter",
    headingGoogleFont: "Playfair+Display:wght@600;700",
    bodyGoogleFont: "Inter:wght@400;500;600",
  },
  {
    id: "fraunces-source",
    name: "Fraunces + Source Sans 3",
    heading: "Fraunces",
    body: "Source Sans 3",
    headingGoogleFont: "Fraunces:wght@600;700",
    bodyGoogleFont: "Source+Sans+3:wght@400;500;600",
  },
  {
    id: "space-grotesk-ibm",
    name: "Space Grotesk + IBM Plex Sans",
    heading: "Space Grotesk",
    body: "IBM Plex Sans",
    headingGoogleFont: "Space+Grotesk:wght@500;700",
    bodyGoogleFont: "IBM+Plex+Sans:wght@400;500;600",
  },
  {
    id: "libre-caslon-karla",
    name: "Libre Caslon + Karla",
    heading: "Libre Caslon Text",
    body: "Karla",
    headingGoogleFont: "Libre+Caslon+Text:wght@700",
    bodyGoogleFont: "Karla:wght@400;500;600",
  },
  {
    id: "archivo-black-nunito",
    name: "Archivo Black + Nunito Sans",
    heading: "Archivo Black",
    body: "Nunito Sans",
    headingGoogleFont: "Archivo+Black",
    bodyGoogleFont: "Nunito+Sans:wght@400;500;600",
  },
  {
    id: "cormorant-work",
    name: "Cormorant + Work Sans",
    heading: "Cormorant Garamond",
    body: "Work Sans",
    headingGoogleFont: "Cormorant+Garamond:wght@600;700",
    bodyGoogleFont: "Work+Sans:wght@400;500;600",
  },
];

export const LAYOUT_MOODS: { id: LayoutMood; name: string; description: string }[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Generous whitespace, quiet typography, restrained accents.",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large type, saturated color blocks, strong contrast.",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-style layout, pull quotes, refined serif detailing.",
  },
];

export function getPalette(id: string): DesignPalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function getFontPairing(id: string): DesignFontPairing {
  return FONT_PAIRINGS.find((f) => f.id === id) ?? FONT_PAIRINGS[0];
}
