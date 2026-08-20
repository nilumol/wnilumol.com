import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core + @sparticuz/chromium (Tailor My Profile's PDF route) must not be
  // bundled/tree-shaken - they resolve their own binary paths at runtime.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Next's file tracer doesn't always pick up files read via a dynamic fs path (not a static
  // import) - include the Chromium binary and the bundled resume font explicitly so both ship
  // with these routes' Vercel serverless functions. See scripts/job-agent/resume-template.ts.
  outputFileTracingIncludes: {
    "/api/job-agent/tailor/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./assets/fonts/open-sans/**/*",
    ],
    "/api/job-agent/tailor/preview": ["./assets/fonts/open-sans/**/*"],
  },
};

export default nextConfig;
