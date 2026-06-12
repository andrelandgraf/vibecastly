'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { toast } from 'sonner';
import { Sparkles, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  getToken,
  agentConfigured,
  listImages,
  listPeople,
  type ImageRecord,
  type PersonRecord,
} from '@/lib/agent-client';
import { PeopleSidebar } from './people-sidebar';
import { MentionComposer } from './mention-composer';
import { ImageGallery } from './image-gallery';

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? '';

export function AppShell({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  const refreshPeople = useCallback(async () => {
    try {
      setPeople(await listPeople());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load people');
    }
  }, []);

  const refreshImages = useCallback(async () => {
    try {
      setImages(await listImages());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    void refreshPeople();
    void refreshImages();
  }, [refreshPeople, refreshImages]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: AGENT_URL,
        fetch: async (input, init) => {
          const token = await getToken();
          const headers = new Headers(init?.headers);
          headers.set('authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [],
  );

  const { sendMessage, status } = useChat({
    transport,
    onError: (err) => toast.error(err.message || 'Generation failed'),
    onFinish: () => {
      void refreshImages();
      setTimeout(() => void refreshImages(), 1500);
    },
  });

  async function handleGenerate(text: string, personIds: string[]) {
    if (!agentConfigured()) {
      toast.error('NEXT_PUBLIC_AGENT_URL is not configured');
      return;
    }
    await sendMessage({ text }, { body: { personIds } });
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = (userName || userEmail).slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/80 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary/15 ring-primary/20 flex size-7 items-center justify-center rounded-lg ring-1">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="font-display text-[15px] font-semibold">Neon Image Studio</span>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="flex flex-1 flex-col lg:flex-row">
        <PeopleSidebar people={people} onChanged={refreshPeople} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
            <div className="mb-8">
              <h1 className="font-display text-2xl font-semibold">
                Create an image
              </h1>
              <p className="text-muted-foreground mb-4 text-sm">
                Describe what you want. Tag people with{' '}
                <span className="text-primary font-medium">@</span> to use their photos as a starting
                point.
              </p>
              <MentionComposer people={people} status={status} onSubmit={handleGenerate} />
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Gallery</h2>
              <span className="text-muted-foreground text-xs">
                {images.length} image{images.length === 1 ? '' : 's'}
              </span>
            </div>
            <ImageGallery images={images} loading={loadingImages} onChanged={refreshImages} />
          </div>
        </main>
      </div>
    </div>
  );
}
