import { z } from 'zod';
const adminUser = z
  .object({
    id: z.uuid(),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']),
    maskedPhone: z.string(),
    onboardingStatus: z.literal('NOT_APPLICABLE'),
  })
  .strict();
const session = z.object({ user: adminUser, csrfToken: z.string().min(1) }).strict();
const challenge = z
  .object({
    mfaChallengeId: z.uuid(),
    mfaToken: z.string(),
    expiresInSeconds: z.number().int().positive(),
  })
  .strict();
export type AdminUser = z.infer<typeof adminUser>;
export type MfaChallenge = z.infer<typeof challenge>;
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    code: string,
  ) {
    super(
      code === 'INVALID_CHALLENGE'
        ? 'Invalid, expired, or already used authenticator code.'
        : status === 429
          ? 'Too many attempts. Please wait before trying again.'
          : status === 401
            ? 'Sign-in failed or your session expired.'
            : status === 403
              ? 'Request denied. Check the session and try again.'
              : 'Unable to connect to the admin API. Please try again.',
    );
  }
}
export class AdminClient {
  private refreshFlight: Promise<AdminUser> | null = null;
  constructor(
    private readonly csrf: () => string,
    private readonly transport: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  private async call(path: string, body?: unknown, csrf = false) {
    try {
      const response = await this.transport(`/api/admin/auth/${path}`, {
        method: path === 'me' ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': this.csrf() } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ code: 'REQUEST_FAILED' }));
        throw new AdminApiError(
          response.status,
          typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED',
        );
      }
      return response.status === 204 ? null : await response.json();
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(0, 'NETWORK_ERROR');
    }
  }
  async login(phone: string, password: string) {
    const result = challenge.safeParse(await this.call('login', { phone, password }));
    if (!result.success) throw new AdminApiError(0, 'INVALID_RESPONSE');
    return result.data;
  }
  async mfa(value: MfaChallenge, code: string) {
    const result = session.safeParse(
      await this.call('mfa/verify', {
        mfaChallengeId: value.mfaChallengeId,
        mfaToken: value.mfaToken,
        code,
      }),
    );
    if (!result.success) throw new AdminApiError(0, 'INVALID_RESPONSE');
    return result.data.user;
  }
  async refresh() {
    if (this.refreshFlight) return this.refreshFlight;
    this.refreshFlight = (async () => {
      const result = session.safeParse(await this.call('refresh', undefined, true));
      if (!result.success) throw new AdminApiError(0, 'INVALID_RESPONSE');
      return result.data.user;
    })();
    try {
      return await this.refreshFlight;
    } finally {
      this.refreshFlight = null;
    }
  }
  async me(): Promise<AdminUser> {
    try {
      const result = session.safeParse(await this.call('me'));
      if (!result.success) throw new AdminApiError(0, 'INVALID_RESPONSE');
      return result.data.user;
    } catch (error) {
      if (!(error instanceof AdminApiError) || error.status !== 401) throw error;
      return this.refresh();
    }
  }
  async logout() {
    await this.me();
    await this.call('logout', undefined, true);
  }
}
