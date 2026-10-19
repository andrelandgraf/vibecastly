'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';

export type Seal<Row> = () => Promise<SealedLiveQuery<Row>>;

export function LiveProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
    if (!url) throw new Error('NEXT_PUBLIC_NEON_REALTIME_URL is not set');
    return createRealtimeClient({ url, logLevel: 'warn' });
  });
  return <RealtimeProvider client={client}>{children}</RealtimeProvider>;
}

function reportLiveError(error: unknown) {
  console.error('[live] subscription failed:', error);
  Sentry.captureException(error, { tags: { component: 'live' } });
  toast.error('Live updates stopped. Reload the page to reconnect.', { id: 'live-error' });
}

// A new `seal` function, such as one bound to another workspace, starts a new
// subscription; callers keep it stable with useCallback otherwise.
function useSealedQuery<Row>(seal: Seal<Row>): SealedLiveQuery<Row> | null {
  const [sealed, setSealed] = useState<{ seal: Seal<Row>; query: SealedLiveQuery<Row> } | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    seal().then(
      (query) => {
        if (!cancelled) setSealed({ seal, query });
      },
      (error: unknown) => {
        if (!cancelled) reportLiveError(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [seal]);
  return sealed?.seal === seal ? sealed.query : null;
}

function Subscribed<Row>({
  query,
  seal,
  children,
}: {
  query: SealedLiveQuery<Row>;
  seal: Seal<Row>;
  children: (rows: readonly Row[] | undefined) => ReactNode;
}) {
  const { data, error } = useLiveQuery(query, { refreshQuery: seal });
  useEffect(() => {
    if (error) reportLiveError(error);
  }, [error]);
  return children(data);
}

/** Renders the live rows of a sealed query; `undefined` until the first result. */
export function Live<Row>({
  seal,
  children,
}: {
  seal: Seal<Row>;
  children: (rows: readonly Row[] | undefined) => ReactNode;
}) {
  const query = useSealedQuery(seal);
  if (!query) return children(undefined);
  return (
    <Subscribed query={query} seal={seal}>
      {children}
    </Subscribed>
  );
}

function OnRows<Row>({ rows, onChange }: { rows: readonly Row[]; onChange: () => void }) {
  // Next 15's bundled React has no useEffectEvent; a new `onChange` must not
  // re-run the effect, only new rows should.
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    latest.current();
  }, [rows]);
  return null;
}

/**
 * Calls `onChange` on every result of a live query. For data whose rendering
 * needs a regular fetch, such as presigned image URLs.
 */
export function LiveSignal<Row>({ seal, onChange }: { seal: Seal<Row>; onChange: () => void }) {
  return (
    <Live seal={seal}>{(rows) => rows && <OnRows rows={rows} onChange={onChange} />}</Live>
  );
}
