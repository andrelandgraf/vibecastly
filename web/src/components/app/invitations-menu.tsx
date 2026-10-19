'use client';

import { useState } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { sealInvitations, type LiveInvitationRow } from '@/lib/agent-client';
import { Live } from '@/lib/live';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function InvitationsMenu() {
  return (
    <Live seal={sealInvitations}>
      {(invites) => <InvitationsMenuView invites={invites ?? []} />}
    </Live>
  );
}

function InvitationsMenuView({ invites }: { invites: readonly LiveInvitationRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function accept(inv: LiveInvitationRow) {
    setBusyId(inv.id);
    try {
      const { error } = await authClient.organization.acceptInvitation({ invitationId: inv.id });
      if (error) {
        toast.error(error.message ?? 'Could not accept invitation');
        return;
      }
      await authClient.organization.setActive({ organizationId: inv.organization_id });
      toast.success('Invitation accepted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not accept invitation');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(inv: LiveInvitationRow) {
    setBusyId(inv.id);
    try {
      await authClient.organization.rejectInvitation({ invitationId: inv.id });
      toast.success('Invitation declined');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not decline invitation');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Invitations" />}
      >
        <Bell className="size-4" />
        {invites.length > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
            {invites.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Invitations</div>
        {invites.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-center text-xs">
            No pending invitations
          </p>
        ) : (
          invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 px-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{inv.organization_name}</p>
                <p className="text-muted-foreground text-xs">invited as {inv.role}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-primary"
                disabled={busyId === inv.id}
                onClick={() => accept(inv)}
                aria-label="Accept"
              >
                {busyId === inv.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={busyId === inv.id}
                onClick={() => reject(inv)}
                aria-label="Decline"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
