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
