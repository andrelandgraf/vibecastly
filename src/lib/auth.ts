import { createRemoteJWKSet, jwtVerify } from 'jose';
import { requireEnv } from './env';

// Neon Auth (Better Auth) injects these into the function at runtime.
const JWKS_URL = requireEnv('NEON_AUTH_JWKS_URL');
// Neon Auth signs tokens with the auth server's ORIGIN as the issuer/audience
// (NEON_AUTH_BASE_URL additionally includes the /<db>/auth path).
const ISSUER = new URL(requireEnv('NEON_AUTH_BASE_URL')).origin;
const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

export async function authenticate(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch (error) {
    console.error('[auth] token verification failed:', error);
    return null;
  }
}
