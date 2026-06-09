import { defineConfig } from '@neondatabase/config/v1';

/**
 * Neon Platform policy for this workspace.
 *
 * The static top-level block declares what *exists* on every branch — the GA service
 * toggles (`auth`, `dataApi`) and the beta `preview` features (AI Gateway, functions,
 * buckets). Because it's static, `parseEnv(config)` / `fetchEnv(config)` know the exact
 * secret set at the type level.
 *
 * The `branch` closure only *tunes* a branch (lifecycle, compute, per-function deploy
 * settings); it can't change which services or functions exist. `neon dev` (no `--source`)
 * serves every function below locally; `neonctl deploy` / `neonctl config apply` provisions
 * them on the branch.
 */
export default defineConfig({
  // GA service toggles — static, drive the typed NeonEnv (auth/dataApi namespaces).
  auth: true,
  dataApi: false,

  // Beta (Preview) features. Functions/buckets are keyed by slug/name.
  preview: {
    aiGateway: false,
    functions: {
      hello: {
        name: 'Hello',
        source: './functions/hello.ts',
        // Declared env keys are typed in `parseEnv(config, 'hello').function.*`; values
        // are uploaded at `config apply`.
        env: { resendApiKey: process.env.RESEND_API_KEY ?? '' },
        // Local dev: bind this exact port (omit `port` to auto-pick a free one).
        dev: { port: 8787 },
      },
      goodbye: {
        name: 'Goodbye',
        source: './functions/goodbye.ts',
        dev: { port: 8788 },
      },
    },
  },

  // Per-branch tuning only. Cannot add/remove services or functions.
  branch: (branch) => ({
    protected: branch.name === 'main',
    ...(branch.name === 'main' ? {} : { parent: 'main', ttl: '7d' }),
    postgres: {
      computeSettings: {
        suspendTimeout: branch.name === 'main' ? false : '5m',
      },
    },
    preview: {
      functions: {
        // Give the main branch's hello function more memory.
        hello: { runtime: "nodejs24" },
      },
    },
  }),
});
