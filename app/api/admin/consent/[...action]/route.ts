import { randomUUID } from 'node:crypto';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string[] }> };
const casePath =
  /^consent-cases\/[a-f0-9-]{36}(?:\/(claim|contact-attempts|evidence|submit-review|decision|withdrawal|withdrawal-intake))?$/i;
function error(status: number, code: string) {
  return Response.json(
    {
      code,
      statusCode: status,
      message: 'The consent request could not be completed.',
      requestId: randomUUID(),
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
async function relay(request: Request, context: Context) {
  const action = (await context.params).action.join('/');
  const match = casePath.exec(action);
  const allowed =
    request.method === 'GET'
      ? action === 'consent-cases' || action === 'support/recipients' || (!!match && !match[1])
      : !!match?.[1];
  if (!allowed) return error(404, 'NOT_FOUND');
  const origin = new URL(process.env.ADMIN_FRONTEND_ORIGIN ?? 'http://localhost:3000').origin;
  if (request.method === 'POST' && request.headers.get('origin') !== origin)
    return error(403, 'FORBIDDEN');
  try {
    const input = new URL(request.url),
      params = new URLSearchParams();
    for (const [key, value] of input.searchParams) {
      if (!['limit', 'cursor', 'state'].includes(key) || value.length > 250)
        return error(400, 'VALIDATION_ERROR');
      params.set(key, value);
    }
    const body = request.method === 'POST' ? await request.text() : undefined;
    if (body && body.length > 8192) return error(400, 'VALIDATION_ERROR');
    const cookie = (request.headers.get('cookie') ?? '')
      .split(';')
      .map((v) => v.trim())
      .filter((v) => /^admin_access=/.test(v))
      .join('; ');
    const upstream = await fetch(
      new URL(
        `/v1/admin/${action}${params.size ? '?' + params.toString() : ''}`,
        process.env.API_BASE_URL ?? 'http://127.0.0.1:4000',
      ),
      {
        method: request.method,
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          Origin: origin,
          'X-CSRF-Token': request.headers.get('x-csrf-token') ?? '',
          'Idempotency-Key': request.headers.get('idempotency-key') ?? '',
          'X-Request-Id': randomUUID(),
        },
        ...(body ? { body } : {}),
      },
    );
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    });
    for (const name of ['x-request-id', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(await upstream.text(), { status: upstream.status, headers });
  } catch {
    return error(503, 'DOMAIN_UNAVAILABLE');
  }
}
export const GET = relay;
export const POST = relay;
