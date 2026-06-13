'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, User, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type AccountUser = {
  name: string;
  email: string;
  image?: string | null;
};

function initialsFor(user: AccountUser): string {
  return (user.name || user.email || '?').slice(0, 2).toUpperCase();
}

function errorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() ? error.message : fallback;
}

export function AccountDialog({
  open,
  onOpenChange,
  user,
  onUserChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccountUser;
  onUserChanged: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="p-4 pb-3 sm:p-5 sm:pb-4">
          <DialogTitle className="font-display text-base">Account settings</DialogTitle>
          <DialogDescription>Manage your profile and sign-in details.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="gap-0">
          <div className="px-4 sm:px-5">
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="profile">
                <User className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security">
                <ShieldCheck className="size-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="max-h-[min(70vh,32rem)] overflow-y-auto p-4 sm:p-5">
            <TabsContent value="profile">
              <ProfileSection user={user} onUserChanged={onUserChanged} />
            </TabsContent>
            <TabsContent value="security">
              <SecuritySection />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSection({
  user,
  onUserChanged,
}: {
  user: AccountUser;
  onUserChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user.name);
    setImage(user.image ?? '');
  }, [user.name, user.image]);

  const trimmedName = name.trim();
  const trimmedImage = image.trim();
  const dirty = trimmedName !== user.name || trimmedImage !== (user.image ?? '');
  const previewUser: AccountUser = { ...user, name: trimmedName || user.name, image: trimmedImage };

  async function save() {
    if (!trimmedName) {
      toast.error('Name cannot be empty');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.updateUser({
        name: trimmedName,
        image: trimmedImage ? trimmedImage : null,
      });
      if (error) {
        toast.error(errorMessage(error, 'Could not update profile'));
        return;
      }
      toast.success('Profile updated');
      await onUserChanged();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={trimmedImage || undefined} alt={previewUser.name} />
          <AvatarFallback className="text-lg">{initialsFor(previewUser)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{previewUser.name}</p>
          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-name">Display name</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-image">Avatar URL</Label>
        <Input
          id="account-image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://…/avatar.jpg"
          inputMode="url"
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs">
          Paste an image link. Leave blank to use your initials.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy || !dirty || !trimmedName}>
          {busy && <Loader2 className="size-4 animate-spin" />} Save changes
        </Button>
      </div>
    </div>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      });
      if (error) {
        toast.error(errorMessage(error, 'Could not change password'));
        return;
      }
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Change password</h3>
        <p className="text-muted-foreground text-xs">
          Use at least 8 characters. You&apos;ll stay signed in on this device.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-current-password">Current password</Label>
        <Input
          id="account-current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="account-new-password">New password</Label>
          <Input
            id="account-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account-confirm-password">Confirm new</Label>
          <Input
            id="account-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <Label htmlFor="account-revoke" className="justify-between gap-3 font-normal">
        <span className="text-muted-foreground text-xs">
          Sign out of other devices after changing
        </span>
        <Switch id="account-revoke" checked={revokeOthers} onCheckedChange={setRevokeOthers} />
      </Label>
      <div className="flex justify-end">
        <Button
          onClick={changePassword}
          disabled={busy || !currentPassword || !newPassword || !confirmPassword}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Change password
        </Button>
      </div>
    </div>
  );
}
