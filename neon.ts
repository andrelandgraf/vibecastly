import { defineConfig } from '@neondatabase/config/v1';

export default defineConfig({
  // Managed Neon Auth (Better Auth). Injects NEON_AUTH_* into functions at runtime.
  auth: true,
  preview: {
    aiGateway: true,
    buckets: {
      // Reference photos of people, and generated images.
      people: {},
      generated: {},
    },
    functions: {
      imagegen: {
        name: 'AI SDK image agent',
        source: 'src/index.ts',
        // Third-party env injected at `neonctl deploy --env .env.deploy` time.
        // All gate to no-ops when unset (local dev / regen): Sentry error
        // monitoring + Mastra Studio observability for the agent.
        env: {
          SENTRY_DSN: process.env.SENTRY_DSN ?? '',
          MASTRA_PROJECT_ID: process.env.MASTRA_PROJECT_ID ?? '',
          MASTRA_PLATFORM_ACCESS_TOKEN: process.env.MASTRA_PLATFORM_ACCESS_TOKEN ?? '',
        },
        dev: {
          port: 8787,
        },
      },
      report: {
        name: 'DX report',
        source: 'src/report.ts',
        dev: {
          port: 8790,
        },
      },
    },
  },
});
