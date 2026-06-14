import { auth } from './auth/server';

// The Neon Auth compute can scale to zero, so the first request after an idle
// period may be slow or transiently fail while it wakes up. A cold/failed
// getSession() must never throw out of a Server Component render — that surfaces
// to users as the generic "An error occurred in the Server Components render"
// error page. Retry once to absorb the cold start, then degrade to "logged out"
// so the page still renders; it recovers on the next request once auth is warm.
export async function getSessionUser() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await auth.getSession();
      return data?.user ?? null;
    } catch (error) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      console.error('[auth] getSession failed; rendering as signed-out:', error);
      return null;
    }
  }
  return null;
}
