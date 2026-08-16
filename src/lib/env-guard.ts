// HTTP header values must be Latin-1 (code points 0-255). Copy-pasting an
// env var value through a word processor or notes app can silently swap a
// hyphen/quote for a smart-punctuation character outside that range, which
// then fails deep inside a fetch call with a cryptic "ByteString" error.
// Catching it here, at the point the value is read, turns that into a
// message that says exactly which variable and where.
export function assertHeaderSafeEnv(name: string, value: string) {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) {
      throw new Error(
        `${name} contains an invalid character at position ${i} (likely a smart-quote/dash/bullet from ` +
          `copy-pasting through a word processor or notes app). Re-copy it from a plain-text source and ` +
          `re-paste it in Vercel's environment variables, then redeploy.`
      );
    }
  }
}
