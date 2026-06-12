import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/server-auth';
import { AppShell } from '@/components/app/app-shell';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return <AppShell userName={user.name} userEmail={user.email} />;
}
