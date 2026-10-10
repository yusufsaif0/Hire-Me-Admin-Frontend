'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import * as C from '../src/consent/client';
const flags = [
  ['independent', 'Communication was independent of the requesting family'],
  ['understood', 'The recipient understood the explanation'],
  ['conflictFree', 'No conflict of interest or pressure was observed'],
  ['disclosedCategories', 'Data categories and proposed family visibility were explained'],
  ['disclosedPurpose', 'Platform identity, purpose and optionality were explained'],
  ['withdrawalExplained', 'The accessible withdrawal process was explained'],
] as const;
const initial = {
  verificationMethod: 'DIRECT_PHONE',
  channelCheck: 'RECIPIENT_CONTROL_CONFIRMED',
  identityCheck: 'NOT_ESTABLISHED',
  comprehensionCheck: 'NOT_ESTABLISHED',
  outcome: 'UNVERIFIABLE',
  independent: false,
  understood: false,
  conflictFree: false,
  disclosedCategories: false,
  disclosedPurpose: false,
  withdrawalExplained: false,
  scopes: [] as string[],
  evidenceReferences: [] as string[],
  noticeVersion: '',
};
function Choice({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {values.map((v) => (
          <option key={v} value={v}>
            {v.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ConsentWorkspace() {
  const api = useMemo(() => new C.ConsentClient(), []),
    alive = useRef(true);
  const [mode, setMode] = useState('Consent review'),
    [state, setState] = useState(''),
    [rows, setRows] = useState<C.Case[]>([]),
    [support, setSupport] = useState<z.infer<typeof C.supportSchema>[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [detail, setDetail] = useState<C.Detail | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [result, setResult] = useState('NO_ANSWER'),
    [method, setMethod] = useState('DIRECT_PHONE'),
    [channelChecked, setChannelChecked] = useState(false),
    [evidence, setEvidence] = useState(initial),
    [references, setReferences] = useState(''),
    [decision, setDecision] = useState('NEEDS_MORE_EVIDENCE'),
    [withdrawIdentity, setWithdrawIdentity] = useState('TWO_NON_SENSITIVE_FACTORS'),
    [withdrawVerified, setWithdrawVerified] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (error) {
      if (alive.current) {
        setMessage(error instanceof Error ? error.message : 'Request unavailable.');
        if (error instanceof C.ConsentError && [403, 404].includes(error.status)) {
          setDetail(null);
          setEvidence(initial);
          setReferences('');
        }
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }, []);
  const load = useCallback(
    async (more = false) => {
      const query = new URLSearchParams();
      if (state && mode === 'Consent review') query.set('state', state);
      if (more && cursor) query.set('cursor', cursor);
      if (mode === 'Consent review') {
        const data = await api.call(`consent-cases?${query}`, C.pageSchema(C.caseSchema));
        if (alive.current) {
          setRows((v) => (more ? [...v, ...data.items] : data.items));
          setCursor(data.nextCursor);
        }
      } else {
        const data = await api.call(`support/recipients?${query}`, C.pageSchema(C.supportSchema));
        if (alive.current) {
          setSupport((v) => (more ? [...v, ...data.items] : data.items));
          setCursor(data.nextCursor);
        }
      }
    },
    [api, cursor, mode, state],
  );
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    alive.current = true;
    void run(() => loadRef.current());
    return () => {
      alive.current = false;
    };
  }, [run]);
  useEffect(() => {
    setDetail(null);
    setCursor(null);
    setEvidence(initial);
    setReferences('');
    void run(() => loadRef.current());
  }, [mode, state, run]);
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState === 'hidden') {
        setDetail(null);
        setEvidence(initial);
        setReferences('');
      }
    };
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, []);
  async function open(id: string) {
    const record = await api.call(`consent-cases/${id}`, C.detailSchema);
    if (alive.current) {
      setDetail(record);
      setEvidence({ ...initial, noticeVersion: record.noticeVersion });
      setReferences('');
      setWithdrawVerified(false);
      setChannelChecked(false);
    }
  }
  async function mutate(action: string, body: unknown) {
    if (!detail) return;
    const response = await api.call(`consent-cases/${detail.id}/${action}`, C.caseSchema, body);
    await open(response.id);
    await loadRef.current();
  }
  const disabled = busy || !detail || Date.parse(detail.expiresAt) <= Date.now();
  return (
    <main className="consent-workspace">
      <Link href="/">Back to workspace</Link>
      <p className="eyebrow">RECIPIENT PRIVACY</p>
      <h1>Assisted consent</h1>
      <p className="lead">
        Independent contact and documented evidence come before sharing. Activation requires a
        different authorized approver.
      </p>
      <div className="consent-tabs">
        <button className="button primary" onClick={() => setMode('Consent review')}>
          Consent review
        </button>
        <button className="button primary" onClick={() => setMode('Redacted support')}>
          Redacted support
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (detail) await open(detail.id);
              await loadRef.current();
            })
          }
        >
          Refresh
        </button>
      </div>
      {busy ? <p role="status">Loading records...</p> : null}
      {message ? (
        <p className="auth-message" role="alert">
          {message}
        </p>
      ) : null}
      <div className="consent-columns">
        <section className="panel">
          <h2>{mode}</h2>
          {mode === 'Consent review' ? (
            <Choice
              label="Case status filter"
              values={[
                '',
                'REQUESTED',
                'ASSIGNED',
                'CONTACT_IN_PROGRESS',
                'EVIDENCE_RECORDED',
                'PENDING_SECOND_REVIEW',
                'APPROVED',
                'DECLINED',
                'UNVERIFIED',
                'NEEDS_MORE_EVIDENCE',
                'LAWFUL_AUTHORITY_REVIEW_REQUIRED',
                'CANCELLED',
              ]}
              value={state}
              onChange={setState}
            />
          ) : null}
          {mode === 'Consent review'
            ? rows.map((row) => (
                <article className="consent-row" key={row.id}>
                  <strong>
                    {row.kind === 'WITHDRAWAL' ? 'Withdrawal request' : 'Consent request'}
                  </strong>
                  <p>{row.state.replaceAll('_', ' ')}</p>
                  <p className="consent-meta">
                    Case {row.id}. Expires {new Date(row.expiresAt).toLocaleString()}
                  </p>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void run(() => open(row.id))}
                  >
                    Open case
                  </button>
                </article>
              ))
            : support.map((row) => (
                <article className="consent-row" key={row.id}>
                  <strong>{row.nameLabel}</strong>
                  <p>
                    {row.state.replaceAll('_', ' ')} -{' '}
                    {row.sharingFrozen ? 'Sharing blocked' : 'Approved scopes apply'}
                  </p>
                  <p className="consent-meta">Record {row.id}</p>
                </article>
              ))}
          {!busy && !(mode === 'Consent review' ? rows.length : support.length) ? (
            <p>No accessible records. Only specifically authorized staff can use these views.</p>
          ) : null}
          {cursor ? (
            <button
              disabled={busy}
              className="button primary"
              onClick={() => void run(() => loadRef.current(true))}
            >
              Load more
            </button>
          ) : null}
        </section>
        <section className="panel">
          <h2>Case detail</h2>
          {!detail ? (
            <p>
              Select an accessible case to begin. Contact details are available only to its assigned
              reviewer.
            </p>
          ) : (
            <>
              <p>
                {detail.state.replaceAll('_', ' ')} - {detail.kind}
              </p>
              <p className="consent-meta">
                Case {detail.id}, version {detail.version}
              </p>
              <p>
                Requested scopes:{' '}
                {detail.requestedScopes.map((v) => v.replaceAll('_', ' ')).join(', ') ||
                  'Withdrawal only'}
              </p>
              <p>Notice version: {detail.noticeVersion}</p>
              {detail.recipientIdentity ? (
                <p>
                  Intended adult recipient: {detail.recipientIdentity.displayName}. Establish
                  identity independently; the submitted name is only a record reference.
                </p>
              ) : null}
              <p>
                Contact attempts: {detail.contactAttempts} / {detail.policy.maxAttempts}
              </p>
              {detail.canClaim ? (
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={() => void run(() => mutate('claim', { version: detail.version }))}
                >
                  Claim case
                </button>
              ) : null}
              {detail.contact ? (
                <div className="consent-notice">
                  <h3>Assigned contact</h3>
                  <p>{detail.contact.phone}</p>
                  <p>
                    {detail.contact.window} - {detail.contact.language}
                  </p>
                  <p>{detail.contact.communicationNeeds}</p>
                  <p>
                    Verify this channel independently. Do not rely on a family member answering or
                    interpreting. No call is placed by this application.
                  </p>
                </div>
              ) : null}
              {detail.canReview && ['ASSIGNED', 'CONTACT_IN_PROGRESS'].includes(detail.state) ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() =>
                      mutate('contact-attempts', {
                        version: detail.version,
                        result,
                        method,
                        channelChecked,
                      }),
                    );
                  }}
                >
                  <h3>Contact attempt</h3>
                  <Choice
                    label="Contact result"
                    values={['NO_ANSWER', 'CONNECTED', 'DECLINED_CONTACT', 'UNSAFE']}
                    value={result}
                    onChange={setResult}
                  />
                  <Choice
                    label="Contact method"
                    values={['DIRECT_PHONE', 'IN_PERSON', 'INDEPENDENT_INTERPRETER']}
                    value={method}
                    onChange={setMethod}
                  />
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={channelChecked}
                      onChange={(e) => setChannelChecked(e.target.checked)}
                    />
                    Channel was independently checked
                  </label>
                  <button
                    className="button primary"
                    disabled={disabled || detail.contactAttempts >= detail.policy.maxAttempts}
                  >
                    Record contact attempt
                  </button>
                </form>
              ) : null}
              {detail.canReview &&
              detail.kind === 'ACTIVATION' &&
              detail.state === 'CONTACT_IN_PROGRESS' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() =>
                      mutate('evidence', {
                        ...evidence,
                        evidenceReferences: references
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                        version: detail.version,
                      }),
                    );
                  }}
                >
                  <h3>Independent evidence</h3>
                  <p>
                    Record observed facts. Silence, pressure, unclear answers, family assertions and
                    unverified identity cannot establish affirmative consent. Evidence references
                    identify protected records; do not paste recordings, identity documents or
                    medical details.
                  </p>
                  <Choice
                    label="Verification method"
                    values={['DIRECT_PHONE', 'IN_PERSON', 'INDEPENDENT_INTERPRETER']}
                    value={evidence.verificationMethod}
                    onChange={(v) => setEvidence({ ...evidence, verificationMethod: v })}
                  />
                  <Choice
                    label="Independent channel check"
                    values={[
                      'RECIPIENT_CONTROL_CONFIRMED',
                      'INDEPENDENT_DIRECTORY',
                      'IN_PERSON_CONTACT',
                    ]}
                    value={evidence.channelCheck}
                    onChange={(v) => setEvidence({ ...evidence, channelCheck: v })}
                  />
                  <Choice
                    label="Identity established by"
                    values={[
                      'NOT_ESTABLISHED',
                      'TWO_NON_SENSITIVE_FACTORS',
                      'KNOWN_RECIPIENT_IN_PERSON',
                    ]}
                    value={evidence.identityCheck}
                    onChange={(v) => setEvidence({ ...evidence, identityCheck: v })}
                  />
                  <Choice
                    label="Comprehension check"
                    values={[
                      'NOT_ESTABLISHED',
                      'EXPLAINED_IN_OWN_WORDS',
                      'AFFIRMATIVE_ACCESSIBLE_RESPONSE',
                    ]}
                    value={evidence.comprehensionCheck}
                    onChange={(v) => setEvidence({ ...evidence, comprehensionCheck: v })}
                  />
                  <Choice
                    label="Recipient outcome"
                    values={['UNVERIFIABLE', 'AFFIRMATIVE', 'DECLINED', 'LAWFUL_AUTHORITY']}
                    value={evidence.outcome}
                    onChange={(v) => setEvidence({ ...evidence, outcome: v })}
                  />
                  {flags.map(([key, label]) => (
                    <label key={key} className="consent-check">
                      <input
                        type="checkbox"
                        checked={evidence[key]}
                        onChange={(e) => setEvidence({ ...evidence, [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                  <fieldset>
                    <legend>Scopes affirmatively granted by recipient</legend>
                    {detail.requestedScopes.map((scope) => (
                      <label className="consent-check" key={scope}>
                        <input
                          type="checkbox"
                          checked={evidence.scopes.includes(scope)}
                          onChange={(e) =>
                            setEvidence({
                              ...evidence,
                              scopes: e.target.checked
                                ? [...evidence.scopes, scope]
                                : evidence.scopes.filter((v) => v !== scope),
                            })
                          }
                        />
                        {scope.replaceAll('_', ' ')}
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Notice version
                    <input
                      aria-label="Notice version"
                      value={evidence.noticeVersion}
                      maxLength={80}
                      onChange={(e) => setEvidence({ ...evidence, noticeVersion: e.target.value })}
                    />
                  </label>
                  <label>
                    Protected evidence references
                    <input
                      aria-label="Protected evidence references"
                      value={references}
                      maxLength={500}
                      placeholder="reference_001, reference_002"
                      onChange={(e) => setReferences(e.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={disabled}>
                    Record evidence
                  </button>
                </form>
              ) : null}
              {detail.evidence ? (
                <div className="consent-notice">
                  <h3>Evidence for review</h3>
                  <p>Outcome: {detail.evidence.outcome}</p>
                  <p>
                    Method: {detail.evidence.verificationMethod}; channel:{' '}
                    {detail.evidence.channelCheck}
                  </p>
                  <p>
                    Identity: {detail.evidence.identityCheck}; comprehension:{' '}
                    {detail.evidence.comprehensionCheck}
                  </p>
                  {flags.map(([key, label]) => (
                    <p key={key}>
                      {label}: {detail.evidence?.[key] ? 'Recorded' : 'Not established'}
                    </p>
                  ))}
                  <p>Scopes: {detail.evidence.scopes.join(', ') || 'None'}</p>
                  <p>Notice: {detail.evidence.noticeVersion}</p>
                  <p>Protected references: {detail.evidence.evidenceReferences.join(', ')}</p>
                </div>
              ) : null}
              {detail.canReview &&
              detail.kind === 'ACTIVATION' &&
              detail.state === 'EVIDENCE_RECORDED' ? (
                <button
                  className="button primary"
                  disabled={disabled}
                  onClick={() =>
                    void run(() => mutate('submit-review', { version: detail.version }))
                  }
                >
                  Submit for second review
                </button>
              ) : null}
              {detail.state === 'PENDING_SECOND_REVIEW' && !detail.canDecide ? (
                <p className="consent-notice">
                  A different authorized approver must make the decision.
                </p>
              ) : null}
              {detail.canDecide ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const reasons: Record<string, string> = {
                      APPROVE: 'SUFFICIENT_INDEPENDENT_EVIDENCE',
                      DECLINE: 'RECIPIENT_DECLINED',
                      UNVERIFIED: 'IDENTITY_UNVERIFIED',
                      NEEDS_MORE_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
                      LAWFUL_AUTHORITY_REVIEW_REQUIRED: 'LAWFUL_AUTHORITY_REQUIRED',
                    };
                    void run(() =>
                      mutate('decision', {
                        version: detail.version,
                        outcome: decision,
                        reasonCode: reasons[decision],
                      }),
                    );
                  }}
                >
                  <h3>Second approver decision</h3>
                  <p>
                    Review the independent evidence. Approval remains blocked when any verification,
                    notice or scope requirement is missing. Lawful-authority cases cannot be
                    activated in Phase 2.
                  </p>
                  <Choice
                    label="Review decision"
                    values={[
                      'NEEDS_MORE_EVIDENCE',
                      'UNVERIFIED',
                      'DECLINE',
                      'LAWFUL_AUTHORITY_REVIEW_REQUIRED',
                      'APPROVE',
                    ]}
                    value={decision}
                    onChange={setDecision}
                  />
                  <button className="button primary" disabled={disabled}>
                    Record decision
                  </button>
                </form>
              ) : null}
              {detail.canReview && detail.kind === 'ACTIVATION' && detail.state === 'APPROVED' ? (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      mutate('withdrawal-intake', {
                        version: detail.version,
                        reasonCode: 'RECIPIENT_REQUESTED_CONTACT',
                      }),
                    )
                  }
                >
                  Record withdrawal contact and stop sharing
                </button>
              ) : null}
              {detail.canReview &&
              detail.kind === 'WITHDRAWAL' &&
              detail.state === 'CONTACT_IN_PROGRESS' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() =>
                      mutate('withdrawal', {
                        version: detail.version,
                        independent: withdrawVerified,
                        channelChecked: withdrawVerified,
                        identityCheck: withdrawIdentity,
                        evidenceReferences: references
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      }),
                    );
                  }}
                >
                  <h3>Confirm recipient withdrawal</h3>
                  <p>
                    Sharing is already stopped as a precaution. Confirm the recipient's withdrawal
                    through independent verified contact.
                  </p>
                  <Choice
                    label="Withdrawal identity check"
                    values={['TWO_NON_SENSITIVE_FACTORS', 'KNOWN_RECIPIENT_IN_PERSON']}
                    value={withdrawIdentity}
                    onChange={setWithdrawIdentity}
                  />
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={withdrawVerified}
                      onChange={(e) => setWithdrawVerified(e.target.checked)}
                    />
                    Independent verified contact confirmed the recipient's withdrawal
                  </label>
                  <label>
                    Withdrawal evidence references
                    <input
                      aria-label="Withdrawal evidence references"
                      value={references}
                      maxLength={500}
                      onChange={(e) => setReferences(e.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={disabled || !withdrawVerified}>
                    Confirm withdrawal
                  </button>
                </form>
              ) : null}
              <h3>Audit timeline</h3>
              <ol>
                {detail.timeline.map((event) => (
                  <li key={event.id}>
                    {event.action.replaceAll('_', ' ')} -{' '}
                    {new Date(event.createdAt).toLocaleString()}
                    <span className="consent-meta"> Staff {event.actorId}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
