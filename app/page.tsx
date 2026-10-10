import { Workspace } from '../components/workspace';
import { AdminSession } from '../components/admin-session';
import { adminSession } from '../src/auth/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
export default async function Page() {
  const user = await adminSession();
  if (!user) {
    const stored = await cookies();
    redirect(
      stored.has('admin_access') || stored.has('admin_refresh') ? '/login?expired=1' : '/login',
    );
  }
  return (
    <>
      <AdminSession user={user} />
      <Workspace />
    </>
  );
}
