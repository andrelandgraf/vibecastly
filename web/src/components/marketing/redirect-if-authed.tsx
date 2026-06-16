'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

// The marketing landing renders when the server couldn't resolve a session.
// That can be a genuine logged-out visitor — or a logged-in user whose
// server-side getSession() degraded during a Neon Auth cold start (it scales
// to zero). The client session check hits the auth endpoint directly and is
// authoritative, so if it reports a real session we refresh the route: by then
// the auth compute is warm and the server re-renders the dashboard instead.
export function RedirectIfAuthed() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const refreshed = useRef(false);

  useEffect(() => {
    if (isPending || refreshed.current) return;
    if (data?.user) {
      refreshed.current = true;
      router.refresh();
    }
  }, [data, isPending, router]);

  return null;
}
