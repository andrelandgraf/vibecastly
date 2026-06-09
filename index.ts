import { parseEnv } from '@neondatabase/env/v1';
import config from './neon.js';

/**
 * Demonstrates reading the Neon branch env via the policy. Synchronous + network-free:
 * `parseEnv` validates the NEON_* vars already present in `process.env` (injected by
 * `neon dev`, `neon-env run -- …`, or a hosting platform) against the `neon.ts` policy
 * and returns the typed `NeonEnv` shape.
 *
 * No branch name is needed: the secret set is static (top-level `auth` / `dataApi`).
 * Omitting the scope reads "external" env (app / build). Inside a deployed function you'd
 * pass its slug instead — e.g. `parseEnv(config, 'hello').function.resendApiKey`.
 *
 * Run with the vars injected, e.g.:
 *   neon-env run -- bun run index.ts
 *   neonctl-test dev   # serves the functions; this script is just for the env demo
 */
const env = parseEnv(config);
console.log('Pooled DATABASE_URL:', env.postgres.databaseUrl);
console.log('Direct  DATABASE_URL:', env.postgres.databaseUrlUnpooled);
// auth is statically present because the policy sets `auth: true`.
console.log('Neon Auth base URL:', env.auth.baseUrl);
