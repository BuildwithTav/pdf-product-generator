// Deterministic cleanup applied to every piece of AI-generated text before
// it's used or saved. Prompts already ask Claude not to use em dashes, but
// that's probabilistic — this is the hard guarantee the business requires.
export function sanitizeGeneratedText<T extends string | null | undefined>(text: T): T {
  if (!text) return text;

  let out = text as string;

  // Em dashes (with or without surrounding spaces, since Claude sometimes
  // omits them) become a comma, the closest common substitute in prose.
  // En dashes are left alone since they're often a legitimate number range
  // (e.g. "20-30 pages") and swapping them for a comma would change the
  // meaning.
  out = out.replace(/\s*—\s*/g, ", ");

  // Tidy the punctuation collisions that replacement above can create.
  out = out.replace(/,(\s*,)+/g, ",");
  out = out.replace(/,\s*\./g, ".");
  out = out.replace(/\.\s*,/g, ".");
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/^,\s*/g, "");
  // A trailing dash (e.g. a dropped-off aside) becomes a dangling comma once
  // replaced above; close the sentence with a period instead.
  out = out.replace(/,[ \t]*$/, ".");

  return out as T;
}

export function sanitizeGeneratedTextArray(items: string[]): string[] {
  return items.map((item) => sanitizeGeneratedText(item));
}
