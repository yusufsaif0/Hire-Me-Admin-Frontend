'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminClient, AdminApiError, type AdminUser } from '../src/auth/client';
import { csrfCookie } from '../src/auth/browser';
import Link from 'next/link';
export function AdminSession({ user }: { user: AdminUser }) {
  const router = useRouter(),
    client = useMemo(() => new AdminClient(csrfCookie), []);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      void client.me().catch((error) => {
        if (!mounted) return;
        if (error instanceof AdminApiError && [401, 403].includes(error.status)) {
          router.replace('/login?expired=1');
          router.refresh();
        } else setMessage('Connection unavailable. Please try again.');
      });
    }, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [client, router]);
  async function logout() {
    setBusy(true);
    try {
      await client.logout();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-session-bar">
      <Link href="/consent">Assisted consent</Link>
      <span>
        {user.role} · {user.maskedPhone} · MFA verified
      </span>
      <button type="button" className="text-button" disabled={busy} onClick={() => void logout()}>
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}
