'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Check, X, Loader2, Plus, Building2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserInvitation = {
  id: string;
  organizationId: string;
  organizationName?: string;
  role?: string;
  status: string;
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'org'}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Onboarding({ userName }: { userName: string }) {
  const [invites, setInvites] = useState<UserInvitation[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authClient.organization.listUserInvitations();
      setInvites((Array.isArray(data) ? data : []).filter((i) => i.status === 'pending'));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10000);
    return () => clearInterval(t);
  }, [refresh]);

  async function accept(inv: UserInvitation) {
    setBusy(inv.id);
    try {
      const { error } = await authClient.organization.acceptInvitation({ invitationId: inv.id });
      if (error) {
        toast.error(error.message ?? 'Could not accept invitation');
        return;
      }
      await authClient.organization.setActive({ organizationId: inv.organizationId });
      toast.success(`Joined ${inv.organizationName ?? 'workspace'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation');
    } finally {
      setBusy(null);
    }
  }

  async function decline(inv: UserInvitation) {
    setBusy(inv.id);
    try {
      await authClient.organization.rejectInvitation({ invitationId: inv.id });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline');
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!name.trim()) return;
    setBusy('create');
    try {
      const { data, error } = await authClient.organization.create({
        name: name.trim(),
        slug: slugify(name),
      });
      if (error) {
        toast.error(
          error.code === 'YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS'
            ? 'You\u2019ve reached the limit of 10 workspaces.'
            : (error.message ?? 'Could not create workspace'),
        );
        return;
      }
      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id });
      }
      toast.success(`Created ${name.trim()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create workspace');
    } finally {
      setBusy(null);
    }
  }

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="animate-fade-up w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 ring-primary/20 mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl ring-1">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Welcome, {firstName} 👋</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Join a workspace you&apos;ve been invited to, or create your own to get started.
          </p>
        </div>

        {invites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Mail className="size-3.5" /> {invites.length} pending invitation
              {invites.length === 1 ? '' : 's'}
            </h2>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm"
                >
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {inv.organizationName ?? 'A workspace'}
                    </p>
                    <p className="text-muted-foreground text-xs">invited as {inv.role ?? 'member'}</p>
                  </div>
                  <Button size="sm" disabled={busy === inv.id} onClick={() => accept(inv)}>
                    {busy === inv.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Join
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    disabled={busy === inv.id}
                    onClick={() => decline(inv)}
                    aria-label="Decline"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs">or</span>
              <div className="bg-border h-px flex-1" />
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="font-display font-semibold">Create a workspace</h2>
          <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
            A workspace holds your people and a shared gallery. Invite teammates anytime.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team"
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <Button onClick={create} disabled={busy === 'create' || !name.trim()} className="gap-1.5">
              {busy === 'create' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
