import { getSessionUser } from '@/lib/server-auth';
import { AppShell } from '@/components/app/app-shell';
import { Landing } from '@/components/marketing/landing';
import { LiveProvider } from '@/lib/live';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getSessionUser();
  if (!user) {
    return <Landing />;
  }

  return (
    <LiveProvider>
      <AppShell userName={user.name} userEmail={user.email} userImage={user.image} />
    </LiveProvider>
  );
}
