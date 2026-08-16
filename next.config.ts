import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These ship native binaries / large assets that shouldn't be bundled by
  // the Next.js server compiler — used only inside the PDF export route.
  serverExternalPackages: ["puppeteer-core", "puppeteer", "@sparticuz/chromium"],
};

export default nextConfig;
