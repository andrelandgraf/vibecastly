'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AccountDialog, type AccountUser } from './account-dialog';

export function AccountMenu({
  initialName,
  initialEmail,
  initialImage,
}: {
  initialName: string;
  initialEmail: string;
  initialImage?: string | null;
}) {
  const router = useRouter();
  const { data: session, refetch } = authClient.useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const user: AccountUser = {
    name: session?.user?.name ?? initialName,
    email: session?.user?.email ?? initialEmail,
    image: session?.user?.image ?? initialImage ?? null,
  };

  const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-9 gap-2 px-1 pr-1.5 sm:pr-2"
              aria-label="Account menu"
            />
          }
        >
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.name}</span>
          <ChevronDown className="text-muted-foreground hidden size-3.5 sm:inline" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar className="size-9">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Settings className="size-4" /> Account settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        onUserChanged={() => refetch()}
      />
    </>
  );
}
