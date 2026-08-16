import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These ship native binaries / large assets that shouldn't be bundled by
  // the Next.js server compiler — used only inside the PDF export route.
  serverExternalPackages: ["puppeteer-core", "puppeteer", "@sparticuz/chromium"],
  // serverExternalPackages alone stops webpack from bundling the package,
  // but Vercel's own deployment file-tracing still needs to be told to
  // physically copy the (dynamically-loaded) Chromium binary into the
  // export route's serverless function — it isn't picked up automatically.
  outputFileTracingIncludes: {
    "/api/projects/[id]/export/pdf/route": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/projects/[id]/export/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
