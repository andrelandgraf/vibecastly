import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // The vendored AI Elements components ship with type/lint drift against the
  // installed base-ui versions, and @ai-sdk/react pulls a duplicate `ai` copy
  // (dual-package type hazard). Our own code is type-checked separately; don't
  // let third-party component noise block the production build.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["pg"],
  // streamdown (used by the AI Elements message renderer) ships ESM that Next's
  // server build splits into vendor chunks that fail to resolve during
  // prerender; transpiling them into the app bundle fixes it.
  transpilePackages: [
    "streamdown",
    "@streamdown/cjk",
    "@streamdown/code",
    "@streamdown/math",
    "@streamdown/mermaid",
  ],
};

export default withSentryConfig(nextConfig, {
  // Org/project slugs and an auth token enable source-map upload on `next build`.
  // Set SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN (e.g. in
  // .env.sentry-build-plugin / CI) to get readable production stack traces.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxy Sentry requests through the app to bypass ad-blockers.
  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});
