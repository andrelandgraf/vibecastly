'use client';

import { Loader2, RotateCw, X, AlertCircle, Sparkles, ShieldAlert, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export type JobErrorKind = 'blocked' | 'rate_limited' | 'failed';

export type Job = {
  id: string;
  prompt: string;
  personIds: string[];
  referenceImage?: File | null;
  status: 'running' | 'error';
  error?: string;
  kind?: JobErrorKind;
};

function errorMeta(kind: JobErrorKind | undefined): {
  title: string;
  icon: ReactNode;
  canRetry: boolean;
} {
  if (kind === 'blocked') {
    return { title: 'Prompt blocked', icon: <ShieldAlert className="text-destructive size-4" />, canRetry: false };
  }
  if (kind === 'rate_limited') {
    return { title: 'Daily limit reached', icon: <Clock className="text-destructive size-4" />, canRetry: false };
  }
  return { title: 'Generation failed', icon: <AlertCircle className="text-destructive size-4" />, canRetry: true };
}

export function JobsPanel({
  jobs,
  onRetry,
  onDismiss,
}: {
  jobs: Job[];
  onRetry: (job: Job) => void;
  onDismiss: (id: string) => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 left-4 z-40 flex flex-col gap-2 sm:left-auto sm:w-72">
      {jobs.map((job) => {
        const meta = job.status === 'error' ? errorMeta(job.kind) : null;
        return (
          <div
            key={job.id}
            className="bg-card animate-in slide-in-from-bottom-2 flex items-start gap-2.5 rounded-xl border p-3 shadow-lg"
          >
            <div className="mt-0.5">
              {job.status === 'running' ? (
                <Loader2 className="text-primary size-4 animate-spin" />
              ) : (
                meta?.icon
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-medium">
                {job.status === 'running' ? (
                  <>
                    <Sparkles className="size-3 text-primary" /> Generating…
                  </>
                ) : (
                  meta?.title
                )}
              </p>
              <p className="text-muted-foreground line-clamp-2 text-xs" title={job.prompt}>
                {job.prompt}
              </p>
              {job.status === 'error' && job.error && (
                <p className="text-destructive/80 mt-0.5 line-clamp-3 text-[11px]">{job.error}</p>
              )}
            </div>
            {job.status === 'error' && (
              <div className="flex shrink-0 gap-0.5">
                {meta?.canRetry && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => onRetry(job)}
                    aria-label="Retry"
                  >
                    <RotateCw className="size-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => onDismiss(job.id)}
                  aria-label="Dismiss"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
