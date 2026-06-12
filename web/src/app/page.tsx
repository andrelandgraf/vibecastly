import { getSessionUser } from '@/lib/server-auth';
import { AppShell } from '@/components/app/app-shell';
import { Landing } from '@/components/marketing/landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getSessionUser();
  if (!user) {
    return <Landing />;
  }

  return <AppShell userName={user.name} userEmail={user.email} />;
}
