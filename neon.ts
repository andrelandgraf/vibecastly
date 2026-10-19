import { defineConfig } from "@neon/config/v1";

// Managed Neon Auth. Injects NEON_AUTH_* into functions at runtime.
// Function secrets (Mastra, Sentry, REALTIME_SECRET) stay on the live deployment;
// set them with `neon functions deploy imagegen --env KEY=VALUE`.
export default defineConfig({
  auth: true,
  aiGateway: true,
  buckets: {
    people: {},
    generated: {},
  },
  preview: {
    realtime: {
      allowedOrigins: ["https://vibecastly.vercel.app", "http://localhost:3000"],
    },
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
