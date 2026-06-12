'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  generate,
  agentConfigured,
  setActiveOrg,
  listImages,
  listPeople,
  IMAGE_LIMIT_PER_ORG,
  type ImageRecord,
  type PersonRecord,
} from '@/lib/agent-client';
import { PeopleSidebar } from './people-sidebar';
import { MentionComposer } from './mention-composer';
import { ImageGallery } from './image-gallery';
import { OrgSwitcher } from './org-switcher';
import { InvitationsMenu } from './invitations-menu';
import { TeamDialog } from './team-dialog';
import { JobsPanel, type Job } from './jobs-panel';
import { Onboarding } from './onboarding';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function AppShell({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const { data: orgs } = authClient.useListOrganizations();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const orgId = activeOrg?.id ?? null;

  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  const refreshPeople = useCallback(async () => {
    try {
      setPeople(await listPeople());
    } catch {
      setPeople([]);
    }
  }, []);

  const refreshImages = useCallback(async () => {
    try {
      setImages(await listImages());
    } catch {
      setImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    if (!orgId && Array.isArray(orgs) && orgs.length > 0) {
      void authClient.organization.setActive({ organizationId: orgs[0].id });
    }
  }, [orgId, orgs]);

  useEffect(() => {
    setActiveOrg(orgId);
    if (orgId) {
      setLoadingImages(true);
      void refreshPeople();
      void refreshImages();
    } else {
      setPeople([]);
      setImages([]);
      setLoadingImages(false);
    }
  }, [orgId, refreshPeople, refreshImages]);

  // Fire-and-forget generation: each call is an independent job, so multiple
  // can run at once without blocking the composer.
  const runJob = useCallback(
    async (prompt: string, personIds: string[]) => {
      if (!agentConfigured()) {
        toast.error('NEXT_PUBLIC_AGENT_URL is not configured');
        return;
      }
      if (!orgId) {
        toast.error('Select a workspace first');
        return;
      }
      const id = crypto.randomUUID();
      setJobs((j) => [...j, { id, prompt, personIds, status: 'running' }]);
      try {
        await generate(prompt, personIds);
        setJobs((j) => j.filter((x) => x.id !== id));
        await refreshImages();
      } catch (err) {
        setJobs((j) =>
          j.map((x) =>
            x.id === id
              ? { ...x, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
              : x,
          ),
        );
      }
    },
    [orgId, refreshImages],
  );

  function personIdsFromPrompt(prompt: string): string[] {
    return people
      .filter((p) => new RegExp(`@${escapeRegex(p.name)}(?![\\w])`).test(prompt))
      .map((p) => p.id);
  }

  function handleRetry(job: Job) {
    setJobs((j) => j.filter((x) => x.id !== job.id));
    void runJob(job.prompt, job.personIds);
  }

  function dismissJob(id: string) {
    setJobs((j) => j.filter((x) => x.id !== id));
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = (userName || userEmail).slice(0, 2).toUpperCase();
  const runningCount = jobs.filter((j) => j.status === 'running').length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/80 sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/15 ring-primary/20 flex size-7 items-center justify-center rounded-lg ring-1">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span className="font-display hidden text-[15px] font-semibold sm:inline">
              Neon Image Studio
            </span>
          </div>
          <div className="bg-border h-5 w-px" />
          <OrgSwitcher />
        </div>
        <div className="flex items-center gap-1.5">
          {orgId && <TeamDialog />}
          <InvitationsMenu onAccepted={refreshImages} />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-muted-foreground text-xs">{userEmail}</p>
          </div>
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      {!orgId ? (
        <Onboarding userName={userName} />
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row">
          <PeopleSidebar people={people} onChanged={refreshPeople} />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
              <div className="mb-8">
                <h1 className="font-display text-2xl font-semibold">Create an image</h1>
                <p className="text-muted-foreground mb-4 text-sm">
                  Describe what you want. Tag people with{' '}
                  <span className="text-primary font-medium">@</span> to use their photos as a
                  starting point. Fire off as many as you like — they run in the background.
                </p>
                <MentionComposer
                  people={people}
                  status="ready"
                  onSubmit={(text, personIds) => {
                    void runJob(text, personIds);
                  }}
                />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">Shared gallery</h2>
                <span className="text-muted-foreground text-xs">
                  {runningCount > 0 && (
                    <span className="text-primary mr-2">{runningCount} generating…</span>
                  )}
                  <span className={images.length >= IMAGE_LIMIT_PER_ORG ? 'text-destructive' : ''}>
                    {images.length} / {IMAGE_LIMIT_PER_ORG} images
                  </span>
                </span>
              </div>
              {images.length >= IMAGE_LIMIT_PER_ORG && (
                <p className="bg-destructive/10 text-destructive mb-3 rounded-lg px-3 py-2 text-xs">
                  This workspace is at the free-plan limit of {IMAGE_LIMIT_PER_ORG} images. Delete
                  some to generate more.
                </p>
              )}
              <ImageGallery
                images={images}
                loading={loadingImages}
                onChanged={refreshImages}
                onRegenerate={(prompt) => void runJob(prompt, personIdsFromPrompt(prompt))}
              />
            </div>
          </main>
        </div>
      )}

      <JobsPanel jobs={jobs} onRetry={handleRetry} onDismiss={dismissJob} />
    </div>
  );
}
