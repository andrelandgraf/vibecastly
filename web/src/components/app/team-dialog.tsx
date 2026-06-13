'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, Mail, X, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Member = {
  id: string;
  role: string;
  user?: { name?: string | null; email?: string | null; image?: string | null };
};
type Invitation = { id: string; email: string; role: string; status: string };

export function TeamDialog() {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authClient.organization.getFullOrganization();
      const m = data?.members;
      const inv = data?.invitations;
      setMembers(Array.isArray(m) ? m : []);
      setInvites(Array.isArray(inv) ? inv.filter((i) => i.status === 'pending') : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, activeOrg?.id, refresh]);

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email: email.trim(),
        role: role === 'admin' ? 'admin' : 'member',
      });
      if (error) {
        toast.error(error.message ?? 'Could not send invitation');
        return;
      }
      toast.success(`Invited ${email.trim()}`);
      setEmail('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send invitation');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    try {
      await authClient.organization.cancelInvitation({ invitationId: id });
      toast.success('Invitation cancelled');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" aria-label="Team" />}
      >
        <Users className="size-4" /> <span className="hidden sm:inline">Team</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{activeOrg?.name ?? 'Team'}</DialogTitle>
          <DialogDescription>
            Invite teammates to collaborate on this workspace&apos;s people and gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && invite()}
            />
          </div>
          <div className="flex gap-2">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={invite}
              disabled={busy || !email.trim()}
              size="icon"
              aria-label="Invite"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            </Button>
          </div>
        </div>

        {invites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">Pending invitations</p>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="bg-muted/50 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              >
                <Mail className="text-muted-foreground size-4" />
                <span className="flex-1 truncate text-sm">{inv.email}</span>
                <Badge variant="secondary" className="text-xs">
                  pending
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => cancel(inv.id)}
                  aria-label="Cancel invitation"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            Members ({members.length})
          </p>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-1 py-1">
              <Avatar className="size-7">
                <AvatarImage src={m.user?.image ?? undefined} alt={m.user?.name ?? ''} />
                <AvatarFallback className="text-xs">
                  {(m.user?.name ?? m.user?.email ?? '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{m.user?.name ?? m.user?.email ?? 'Member'}</p>
              </div>
              <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
