'use client';
import { useCallback, useEffect, useState } from 'react';
import { healthResponseSchemaFor, pilotServices, type HealthResponse } from '../src/lib/contracts';

type View = 'overview' | 'applications' | 'roadmap' | 'system';
const navigation: { id: View; label: string; symbol: string }[] = [
  { id: 'overview', label: 'Overview', symbol: '◫' },
  { id: 'applications', label: 'Applications', symbol: '▦' },
  { id: 'roadmap', label: 'Build roadmap', symbol: '↗' },
  { id: 'system', label: 'System health', symbol: '◉' },
];
const phases = [
  ['Foundation', 'Workspaces, contracts, local services and API health'],
  ['Identity & access', 'Phone OTP, roles, refresh tokens and admin MFA'],
  ['Profiles & consent', 'Recipients, emergency contacts and Care Circle'],
  ['Catalog & quotes', 'Coverage, availability and versioned pricing'],
  ['Bookings', 'State machine, event history and idempotency'],
  ['Worker verification', 'Onboarding, checks and training eligibility'],
  ['Dispatch', 'Worker availability, offers and assignment controls'],
  ['Payments', 'Sandbox payments, ledger, refunds and payouts'],
  ['Service delivery', 'Arrival PIN, checkpoints and incident escalation'],
  ['Operations', 'Support, audit trail and privacy workflows'],
  ['Hardening', 'Security, accessibility and resilience validation'],
  ['Pilot readiness', 'Runbooks, release gates and deployment approvals'],
];
const applications = [
  {
    title: 'Customer app',
    audience: 'FOR FAMILIES',
    text: 'A considered starting point for arranging help for yourself or a loved one.',
    tech: 'React Native · Expo',
    href: 'http://localhost:8081',
    port: '8081',
    initial: 'C',
    command: 'npm run dev',
    directory: 'customer-app/frontend',
  },
  {
    title: 'Worker app',
    audience: 'FOR ASSISTANTS',
    text: 'A dedicated space for the people who make dependable assistance possible.',
    tech: 'React Native · Expo',
    href: 'http://localhost:8082',
    port: '8082',
    initial: 'W',
    command: 'npm run dev',
    directory: 'worker-app/frontend',
  },
  {
    title: 'Operations portal',
    audience: 'FOR YOUR TEAM',
    text: 'The foundation for coordinating a focused, carefully managed local pilot.',
    tech: 'Next.js · TypeScript',
    href: 'http://localhost:3000',
    port: '3000',
    initial: 'O',
    command: 'npm run dev',
    directory: 'admin-panel/frontend',
  },
];
export function Workspace() {
  const [view, setView] = useState<View>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const checkHealth = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok)
        throw new Error('The admin backend is offline. Run npm run dev in admin-panel/backend.');
      setHealth(
        healthResponseSchemaFor('trusted-assistance-admin-api').parse(await response.json()),
      );
    } catch (cause) {
      setHealth(null);
      setError(cause instanceof Error ? cause.message : 'Unable to reach the API.');
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);
  const label = navigation.find((item) => item.id === view)?.label ?? 'Overview';
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Trusted Assistance home">
          <span className="brand-mark">
            t<span>·</span>
          </span>
          <span>
            trusted<span className="brand-sub">ASSISTANCE</span>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-item active' : 'nav-item'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              <span aria-hidden="true">{item.symbol}</span>
              {item.label}
              {view === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-note">
            <span className="small-dot" /> DELHI NCR PILOT
            <p>
              Start local.
              <br />
              Build trust, every day.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">TA</span>
            <div>
              <strong>Founder's workspace</strong>
              <span>Local development</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="separator">/</span>
            <span>{label}</span>
          </div>
          <span className="environment">
            <span className="small-dot" /> Development
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">A STRONG START, A HUMAN PURPOSE</p>
              <h1>{view === 'overview' ? 'Your foundation for better care.' : label}</h1>
              <p className="lead">
                {view === 'overview'
                  ? 'Build the tools. Bring the right people together. Help families feel closer.'
                  : view === 'applications'
                    ? 'Three dedicated experiences with independent APIs and role-based access.'
                    : view === 'roadmap'
                      ? 'A phased path from the first line of code to a carefully managed pilot.'
                      : 'Check the local API and understand what this foundation provides.'}
              </p>
            </div>
            <span className="phase-tag">
              PHASE 01 <span>Foundation</span>
            </span>
          </div>
          {view === 'overview' && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-kicker">TRUSTED HUMAN ASSISTANCE</span>
                  <h2>
                    Someone there.
                    <br />
                    <span>When it matters.</span>
                  </h2>
                  <p>
                    Non-medical support for everyday moments that deserve a little more care.
                    Beginning with families in Delhi NCR.
                  </p>
                  <button className="button light" onClick={() => setView('roadmap')}>
                    Explore the build roadmap <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit orbit-three" />
                  <div className="art-caption">
                    FAMILY <span>CONNECTED THROUGH CARE</span>
                  </div>
                  <div className="art-card family-card">
                    <span>♡</span>
                    <div>
                      A circle of care<small>People before everything.</small>
                    </div>
                  </div>
                  <div className="person person-one">
                    <span className="head" />
                    <span className="body" />
                  </div>
                  <div className="person person-two">
                    <span className="head" />
                    <span className="body" />
                  </div>
                  <div className="person person-three">
                    <span className="head" />
                    <span className="body" />
                  </div>
                  <div className="art-card trust-card">
                    <span>✓</span>Built on trust
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <h2>One mission. Three experiences.</h2>
                <button className="text-button" onClick={() => setView('applications')}>
                  View applications <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="application-grid">
                {applications.map((app) => (
                  <article className="application-card" key={app.title}>
                    <div className="card-top">
                      <span className={'app-icon icon-' + app.initial.toLowerCase()}>
                        {app.initial}
                      </span>
                      <span className="subtle-pill">Starter</span>
                    </div>
                    <p className="eyebrow">{app.audience}</p>
                    <h3>{app.title}</h3>
                    <p>{app.text}</p>
                    <div className="card-footer">
                      <span>{app.tech}</span>
                      <a
                        href={app.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={'Open ' + app.title + ' local preview'}
                      >
                        ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              <div className="bottom-grid">
                <section className="panel">
                  <div className="section-heading compact">
                    <h2>A focused first step</h2>
                    <span className="subtle-pill">Pilot scope</span>
                  </div>
                  <p className="panel-intro">
                    Three services. Clear boundaries. A dependable local team.
                  </p>
                  {pilotServices.map((service, index) => (
                    <div className="service-row" key={service.id}>
                      <span className="service-number">0{index + 1}</span>
                      <div>
                        <strong>{service.name}</strong>
                        <p>{service.description}</p>
                      </div>
                      <span className="service-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                  ))}
                  <div className="scope-note">Non-medical assistance · Consent comes first</div>
                </section>
                <section className="panel foundation-panel">
                  <div className="section-heading compact">
                    <h2>Foundation check</h2>
                    <span className="small-dot" />
                  </div>
                  <p className="panel-intro">The starting pieces for your next phase.</p>
                  <div className="check-row">
                    <span>✓</span>Module-local TypeScript contracts
                  </div>
                  <div className="check-row">
                    <span>✓</span>Customer & worker app starters
                  </div>
                  <div className="check-row">
                    <span>✓</span>API documentation & request IDs
                  </div>
                  <div className="check-row">
                    <span>✓</span>Local services & CI configuration
                  </div>
                  <div className="api-status" role="status">
                    <span className={health ? 'small-dot' : 'small-dot offline'} />
                    <div>
                      <strong>
                        {checking
                          ? 'Checking API…'
                          : health
                            ? 'Local API connected'
                            : 'Local API offline'}
                      </strong>
                      <span>
                        {health ? 'Mock integrations · API liveness' : 'Start admin-panel/backend'}
                      </span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => void checkHealth()}
                      disabled={checking}
                      aria-label="Recheck local API health"
                    >
                      ↻
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === 'applications' && (
            <section className="panel">
              {applications.map((app) => (
                <article className="application-detail" key={app.title}>
                  <span className={'app-icon icon-' + app.initial.toLowerCase()}>
                    {app.initial}
                  </span>
                  <div>
                    <p className="eyebrow">{app.audience}</p>
                    <h2>{app.title}</h2>
                    <p>{app.text}</p>
                    <p className="muted">Open a terminal in {app.directory}, then run:</p>
                    <code>{app.command}</code>
                    <p className="muted">
                      {app.tech} · Local port {app.port}. Start its command before opening the
                      preview.
                    </p>
                  </div>
                  <a className="button primary" href={app.href} target="_blank" rel="noreferrer">
                    Open preview ↗
                  </a>
                </article>
              ))}
            </section>
          )}
          {view === 'roadmap' && (
            <section className="panel">
              <div className="roadmap-intro">
                <span className="subtle-pill">Phases 0 and 1 implemented</span>
                <p>
                  Later phases are planned. Profiles, bookings, payments and live operations are not
                  enabled yet.
                </p>
              </div>
              {phases.map(([title, description], index) => (
                <div className="roadmap-row" key={title}>
                  <span className={index === 0 ? 'phase-number complete' : 'phase-number'}>
                    {String(index).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="subtle-pill">{index <= 1 ? 'Implemented' : 'Planned'}</span>
                </div>
              ))}
            </section>
          )}
          {view === 'system' && (
            <section className="panel system-panel">
              <span className="app-icon icon-o">↔</span>
              <h2>
                {checking
                  ? 'Checking the local API…'
                  : health
                    ? 'Your local API is responding.'
                    : 'Your local API is offline.'}
              </h2>
              <p role="status">
                {error ||
                  (health
                    ? 'The process is live. External services are mocked for this phase.'
                    : 'Connecting to the local foundation.')}
              </p>
              <button
                className="button primary"
                disabled={checking}
                onClick={() => void checkHealth()}
              >
                {checking ? 'Checking…' : 'Check again'}
              </button>
              <dl>
                <div>
                  <dt>Endpoint</dt>
                  <dd>
                    <code>GET /v1/health</code>
                  </dd>
                </div>
                <div>
                  <dt>Integration mode</dt>
                  <dd>Mock only</dd>
                </div>
                <div>
                  <dt>Last response</dt>
                  <dd>{health?.timestamp ?? 'No successful response yet'}</dd>
                </div>
                <div>
                  <dt>API documentation</dt>
                  <dd>
                    <a href="http://127.0.0.1:4000/docs" target="_blank" rel="noreferrer">
                      Open local Swagger ↗
                    </a>
                  </dd>
                </div>
              </dl>
              <p className="scope-note">
                Health measures process liveness. It does not verify MongoDB, Redis, worker
                availability or production readiness.
              </p>
            </section>
          )}
          <footer className="footer">
            <span>
              Trusted Assistance <span className="footer-dot">·</span> People before everything.
            </span>
            <span>Foundation v0.1.0</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
