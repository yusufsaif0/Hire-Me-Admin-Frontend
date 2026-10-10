import { z } from 'zod';
import { AdminClient, AdminApiError } from '../auth/client';
import { csrfCookie } from '../auth/browser';
export const scopes = ['RECIPIENT_DETAILS', 'EMERGENCY_CONTACTS', 'ASSISTANCE_NOTES'] as const;
export const caseSchema = z.object({
  id: z.uuid(),
  version: z.number(),
  recipientId: z.uuid(),
  state: z.string(),
  kind: z.enum(['ACTIVATION', 'WITHDRAWAL']),
  assignedReviewerId: z.uuid().nullable(),
  secondApproverId: z.uuid().nullable(),
  requestedScopes: z.array(z.enum(scopes)),
  consentScopes: z.array(z.enum(scopes)),
  noticeVersion: z.string(),
  contactAttempts: z.number(),
  expiresAt: z.string(),
  reasonCode: z.string().nullable(),
});
export const evidenceSchema = z.object({
  verificationMethod: z.string(),
  channelCheck: z.string(),
  identityCheck: z.string(),
  independent: z.boolean(),
  understood: z.boolean(),
  conflictFree: z.boolean(),
  disclosedCategories: z.boolean(),
  disclosedPurpose: z.boolean(),
  withdrawalExplained: z.boolean(),
  comprehensionCheck: z.string(),
  outcome: z.string(),
  scopes: z.array(z.enum(scopes)),
  noticeVersion: z.string(),
  evidenceReferences: z.array(z.string()),
});
export const detailSchema = caseSchema.extend({
  recipientIdentity: z.object({ displayName: z.string(), adult: z.literal(true) }).nullable(),
  canClaim: z.boolean(),
  canReview: z.boolean(),
  canDecide: z.boolean(),
  contact: z
    .object({
      phone: z.string(),
      window: z.string(),
      language: z.string(),
      communicationNeeds: z.string(),
    })
    .nullable(),
  evidence: evidenceSchema.nullable(),
  policy: z.object({
    maxAttempts: z.number(),
    noticeVersion: z.string(),
    caseDays: z.number(),
    consentDays: z.number(),
  }),
  timeline: z.array(
    z.object({ id: z.uuid(), action: z.string(), actorId: z.uuid(), createdAt: z.string() }),
  ),
});
export const supportSchema = z.object({
  id: z.uuid(),
  version: z.number(),
  nameLabel: z.string(),
  state: z.string(),
  sharingFrozen: z.boolean(),
  consentExpiresAt: z.string().nullable(),
});
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export type Case = z.infer<typeof caseSchema>;
export type Detail = z.infer<typeof detailSchema>;
export class ConsentError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(
      code === 'RECENT_MFA_REQUIRED'
        ? 'Sign out and sign in with a new authenticator code. Recent MFA is required.'
        : status === 403
          ? 'No access. An explicit consent-review or support permission is required; reviewers cannot approve their own case.'
          : status === 404
            ? 'This case is unavailable or assigned to another reviewer.'
            : status === 409
              ? 'This record changed. Refresh before retrying.'
              : status === 422
                ? 'The review state or independent evidence does not permit this action.'
                : status === 429
                  ? 'The contact or request limit has been reached.'
                  : status === 400
                    ? 'Check the required fields and evidence references.'
                    : 'Unable to connect. Refresh and try again.',
    );
  }
}
export class ConsentClient {
  private readonly auth = new AdminClient(csrfCookie);
  private pending: { fingerprint: string; key: string } | null = null;
  async call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const fingerprint = JSON.stringify([path, body]);
    const key =
      body === undefined
        ? null
        : this.pending?.fingerprint === fingerprint
          ? this.pending.key
          : crypto.randomUUID();
    if (key) this.pending = { fingerprint, key };
    const send = () =>
      fetch(`/api/admin/consent/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'Idempotency-Key': key, 'X-CSRF-Token': csrfCookie() } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    try {
      let response = await send();
      if (response.status === 401) {
        await this.auth.refresh();
        response = await send();
      }
      if (response.status === 401) {
        location.assign('/login?expired=1');
        throw new ConsentError(401, 'INVALID_SESSION');
      }
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status !== 503) this.pending = null;
        throw new ConsentError(
          response.status,
          typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
        );
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) throw new ConsentError(503, 'INVALID_RESPONSE');
      this.pending = null;
      return parsed.data;
    } catch (error) {
      if (error instanceof AdminApiError && [401, 403].includes(error.status)) {
        location.assign('/login?expired=1');
        throw new ConsentError(401, 'INVALID_SESSION');
      }
      if (error instanceof ConsentError) throw error;
      throw new ConsentError(0, 'NETWORK_ERROR');
    }
  }
}
