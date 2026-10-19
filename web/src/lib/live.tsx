'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { createRealtimeClient, type SealedLiveQuery } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';
import { AgentError } from '@/lib/agent-client';

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

// The SDK retries a failed renewal every second until it succeeds, so only an
// answer that cannot change on retry ends the subscription.
function isPermanent(error: unknown): boolean {
  return error instanceof AgentError && [401, 403, 404].includes(error.status ?? 0);
}

type SealState<Row> = { seal: Seal<Row>; query: SealedLiveQuery<Row> | null };

// A new `seal` function, such as one bound to another workspace, starts a new
// subscription; callers keep it stable with useCallback otherwise.
function useSealedQuery<Row>(seal: Seal<Row>) {
  const [state, setState] = useState<SealState<Row> | null>(null);
  const current = useRef(seal);
  const reported = useRef<Seal<Row> | null>(null);
  useEffect(() => {
    current.current = seal;
  }, [seal]);

  // A renewal for a previous scope can still settle after the switch.
  const fail = useCallback(
    (error: unknown) => {
      if (current.current !== seal) return;
      if (reported.current !== seal) {
        reported.current = seal;
        reportLiveError(error);
      }
      if (isPermanent(error)) {
        setState((s) => (s?.seal === seal ? { seal, query: null } : s));
      }
    },
    [seal],
  );

  useEffect(() => {
    let cancelled = false;
    seal().then(
      (query) => {
        if (!cancelled) setState({ seal, query });
      },
      (error: unknown) => {
        if (!cancelled) fail(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [seal, fail]);

  const renew = useCallback(async () => {
    try {
      return await seal();
    } catch (error) {
      fail(error);
      throw error;
    }
  }, [seal, fail]);

  return { query: state?.seal === seal ? state.query : null, renew, fail };
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function Subscriber<Row>({
  query,
  renew,
  fail,
  onRows,
}: {
  query: SealedLiveQuery<Row>;
  renew: Seal<Row>;
  fail: (error: unknown) => void;
  onRows: (rows: readonly Row[]) => void;
}) {
  const { data, error } = useLiveQuery(query, { refreshQuery: renew });
  // Next 15's bundled React has no useEffectEvent; only new rows, not a new
  // callback, may fire it.
  const latest = useLatest(onRows);
  useEffect(() => {
    if (data) latest.current(data);
  }, [data, latest]);
  useEffect(() => {
    if (error) fail(error);
  }, [error, fail]);
  return null;
}

/** Renders the live rows of a sealed query; `undefined` until the first result. */
export function Live<Row>({
  seal,
  children,
}: {
  seal: Seal<Row>;
  children: (rows: readonly Row[] | undefined) => ReactNode;
}) {
  const { query, renew, fail } = useSealedQuery(seal);
  const [rows, setRows] = useState<{ seal: Seal<Row>; rows: readonly Row[] } | null>(null);
  const onRows = useCallback((next: readonly Row[]) => setRows({ seal, rows: next }), [seal]);
  // `children` stays at one position in the tree, so resolving the query or
  // receiving rows never remounts it.
  return (
    <>
      {query && <Subscriber query={query} renew={renew} fail={fail} onRows={onRows} />}
      {children(rows?.seal === seal ? rows.rows : undefined)}
    </>
  );
}

/**
 * Calls `onChange` on every result of a live query. For data whose rendering
 * needs a regular fetch, such as presigned image URLs.
 */
export function LiveSignal<Row>({ seal, onChange }: { seal: Seal<Row>; onChange: () => void }) {
  const { query, renew, fail } = useSealedQuery(seal);
  return query && <Subscriber query={query} renew={renew} fail={fail} onRows={onChange} />;
}
