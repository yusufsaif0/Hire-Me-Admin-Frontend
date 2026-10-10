'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminClient, type MfaChallenge } from '../src/auth/client';
import { csrfCookie } from '../src/auth/browser';
export function LoginForm({ expired }: { expired: boolean }) {
  const router = useRouter();
  const client = useMemo(() => new AdminClient(csrfCookie), []);
  const [phone, setPhone] = useState('+91'),
    [password, setPassword] = useState(''),
    [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(
      expired ? 'Your session expired. Sign in again or restore your existing session.' : '',
    );
  useEffect(() => {
    if (!csrfCookie()) return;
    let mounted = true;
    void client
      .me()
      .then(() => {
        if (mounted) {
          router.replace('/');
          router.refresh();
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [client, router]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (challenge) {
        await client.mfa(challenge, code);
        setCode('');
        setChallenge(null);
        router.replace('/');
        router.refresh();
      } else {
        setChallenge(await client.login(phone, password));
        setPassword('');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="auth-brand" href="/login">
          trusted <span>ASSISTANCE</span>
        </a>
        <p className="eyebrow">FOR YOUR TEAM</p>
        <h1>{challenge ? 'One more step.' : 'Welcome to your workspace.'}</h1>
        <p className="lead">
          {challenge
            ? 'Enter the six-digit code from your enrolled authenticator.'
            : 'Sign in with your provisioned admin account. Admin registration is restricted.'}
        </p>
        <form onSubmit={(event) => void submit(event)}>
          {challenge ? (
            <>
              <label htmlFor="totp">Authenticator code</label>
              <input
                id="totp"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={busy}
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="username"
                maxLength={40}
                disabled={busy}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                maxLength={128}
                disabled={busy}
                required
              />
            </>
          )}
          <button
            className="button primary"
            type="submit"
            disabled={busy || (Boolean(challenge) && code.length !== 6)}
          >
            {busy ? 'Checking…' : challenge ? 'Verify and open workspace' : 'Continue to MFA'}
          </button>
          {message ? (
            <p role="alert" className="auth-message">
              {message}
            </p>
          ) : null}
          {challenge ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setChallenge(null);
                setCode('');
                setMessage('');
              }}
            >
              Start sign-in again
            </button>
          ) : null}
        </form>
        <p className="auth-note">Non-medical assistance. People before everything.</p>
        <a href="/api/health" className="text-button">
          Local API health diagnostic
        </a>
      </section>
    </main>
  );
}
