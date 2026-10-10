import { redirect } from 'next/navigation';
import { adminSession } from '../../src/auth/server';
import { AdminSession } from '../../components/admin-session';
import { ConsentWorkspace } from '../../components/consent-workspace';
export default async function ConsentPage() {
  const user = await adminSession();
  if (!user) redirect('/login?expired=1');
  return (
    <>
      <AdminSession user={user} />
      <ConsentWorkspace />
    </>
  );
}
