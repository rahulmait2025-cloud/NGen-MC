import { redirect } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';

export default async function Home() {
  const session = await getSessionFromHeaders();

  if (session?.globalRole === 'superadmin') {
    redirect('/dashboard');
  }

  redirect('/login');
}
