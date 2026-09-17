import { defineConfig } from "@neon/config/v1";

// Managed Neon Auth. Injects NEON_AUTH_* into functions at runtime.
// Mastra/Sentry Function secrets stay on the live deployment — see rate-my-pricing.
export default defineConfig({
  auth: true,
  aiGateway: true,
  buckets: {
    people: {},
    generated: {},
  },
  functions: {
    imagegen: {
      name: "AI SDK image agent",
      source: "src/index.ts",
      dev: {
        port: 8787,
      },
    },
    report: {
      name: "DX report",
      source: "src/report.ts",
      dev: {
        port: 8790,
      },
    },
  },
});
