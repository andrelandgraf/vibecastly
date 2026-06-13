import * as Sentry from '@sentry/node';

// Imported first in src/index.ts so the SDK is active before anything else runs.
// `enabled` is gated on the DSN, so locally (and on regen, where SENTRY_DSN is
// unset) this is a no-op. The DSN is injected onto the deployed function via the
// `env` block in neon.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 1.0,
  environment: process.env.NEON_BRANCH ? 'branch' : 'production',
});

export { Sentry };
