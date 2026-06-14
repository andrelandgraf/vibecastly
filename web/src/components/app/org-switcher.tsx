'use client';

import { useState } from 'react';
import {
  ChevronsUpDown,
  Plus,
  Check,
  Building2,
  Loader2,
  Settings,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Org = { id: string; name: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'org'}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OrgSwitcher() {
  const { data: orgs, refetch: refetchOrgs } = authClient.useListOrganizations();
  const { data: activeOrg, refetch: refetchActive } = authClient.useActiveOrganization();
  const { data: activeMember } = authClient.useActiveMember();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  const list: Org[] = Array.isArray(orgs) ? orgs : [];
  const role = activeMember?.role;
  const canManage = role === 'owner' || role === 'admin';
  const canDelete = role === 'owner';

  async function handleSelect(id: string) {
    if (id === activeOrg?.id) return;
    await authClient.organization.setActive({ organizationId: id });
  }

  function openSettings() {
    setRenameValue(activeOrg?.name ?? '');
    setDeleteConfirm('');
    setSettingsOpen(true);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await authClient.organization.create({
        name: name.trim(),
        slug: slugify(name),
      });
      if (error) {
        const msg =
          error.code === 'YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS'
            ? 'You\u2019ve reached the limit of 10 workspaces.'
            : (error.message ?? 'Could not create organization');
        toast.error(msg);
        return;
      }
      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id });
      }
      toast.success(`Created ${name.trim()}`);
      setOpen(false);
      setName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create organization');
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    const next = renameValue.trim();
    if (!activeOrg || !next || next === activeOrg.name) return;
    setRenameBusy(true);
    try {
      const { error } = await authClient.organization.update({
        organizationId: activeOrg.id,
        data: { name: next },
      });
      if (error) {
        toast.error(error.message ?? 'Could not rename workspace');
        return;
      }
      toast.success('Workspace renamed');
      await Promise.all([refetchActive(), refetchOrgs()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename workspace');
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeOrg || deleteConfirm.trim() !== activeOrg.name) return;
    setDeleteBusy(true);
    try {
      const { error } = await authClient.organization.delete({ organizationId: activeOrg.id });
      if (error) {
        toast.error(error.message ?? 'Could not delete workspace');
        return;
      }
      toast.success(`Deleted ${activeOrg.name}`);
      setSettingsOpen(false);
      const remaining = list.filter((o) => o.id !== activeOrg.id);
      if (remaining[0]) {
        await authClient.organization.setActive({ organizationId: remaining[0].id });
      }
      await Promise.all([refetchOrgs(), refetchActive()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete workspace');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-2 font-display" />}
        >
          <Building2 className="size-4 text-primary" />
          <span className="max-w-32 truncate">{activeOrg?.name ?? 'Select workspace'}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Workspaces</div>
          {list.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">No workspaces yet</p>
          )}
          {list.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => handleSelect(org.id)}>
              <Building2 className="size-4" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === activeOrg?.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {activeOrg && (
            <DropdownMenuItem onClick={openSettings}>
              <Settings className="size-4" /> Workspace settings
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create workspace */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
            <DialogDescription>
              Workspaces let you collaborate with teammates on a shared gallery and people.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={busy || !name.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workspace settings: rename + delete */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Workspace settings</DialogTitle>
            <DialogDescription>Rename or delete this workspace.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="org-rename">Name</Label>
            <div className="flex gap-2">
              <Input
                id="org-rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                disabled={!canManage}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <Button
                onClick={handleRename}
                disabled={
                  !canManage ||
                  renameBusy ||
                  !renameValue.trim() ||
                  renameValue.trim() === activeOrg?.name
                }
              >
                {renameBusy && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </div>
            {!canManage && (
              <p className="text-muted-foreground text-xs">
                Only owners and admins can rename this workspace.
              </p>
            )}
          </div>

          {canDelete && (
            <>
              <div className="bg-border h-px" />
              <div className="space-y-3">
                <Alert variant="destructive">
                  <TriangleAlert />
                  <AlertTitle>Delete workspace</AlertTitle>
                  <AlertDescription>
                    Permanently deletes <span className="text-foreground font-medium">{activeOrg?.name}</span>{' '}
                    and its shared people, gallery, and members. This cannot be undone.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="org-delete-confirm">
                    Type <span className="text-foreground font-semibold">{activeOrg?.name}</span> to
                    confirm
                  </Label>
                  <Input
                    id="org-delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={activeOrg?.name}
                    autoComplete="off"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteBusy || deleteConfirm.trim() !== activeOrg?.name}
                  >
                    {deleteBusy && <Loader2 className="size-4 animate-spin" />} Delete workspace
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
