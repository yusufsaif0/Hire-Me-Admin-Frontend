import { randomUUID } from 'node:crypto';
export const dynamic = 'force-dynamic';
const allowed = new Map([
  ['login', 'POST'],
  ['mfa/verify', 'POST'],
  ['refresh', 'POST'],
  ['logout', 'POST'],
  ['me', 'GET'],
]);
type Context = { params: Promise<{ action: string[] }> };
async function relay(request: Request, context: Context) {
  const action = (await context.params).action.join('/');
  if (allowed.get(action) !== request.method)
    return Response.json(
      { code: 'NOT_FOUND', message: 'Not found.', statusCode: 404, requestId: randomUUID() },
      { status: 404 },
    );
  const origin = process.env.ADMIN_FRONTEND_ORIGIN ?? 'http://localhost:3000';
  if (request.method === 'POST' && request.headers.get('origin') !== origin)
    return Response.json(
      { code: 'FORBIDDEN', message: 'Request denied.', statusCode: 403, requestId: randomUUID() },
      { status: 403 },
    );
  try {
    const body = request.method === 'POST' ? await request.text() : undefined;
    if (body && body.length > 4096)
      return Response.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request.',
          statusCode: 400,
          requestId: randomUUID(),
        },
        { status: 400 },
      );
    const cookie = (request.headers.get('cookie') ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => /^(admin_access|admin_refresh|admin_csrf)=/.test(part))
      .join('; ');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie,
      'X-CSRF-Token': request.headers.get('x-csrf-token') ?? '',
      'X-Request-Id': randomUUID(),
    };
    const upstream = await fetch(
      new URL(`/v1/admin/auth/${action}`, process.env.API_BASE_URL ?? 'http://127.0.0.1:4000'),
      {
        method: request.method,
        headers,
        ...(body ? { body } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      },
    );
    const outputHeaders = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    });
    for (const value of upstream.headers.getSetCookie()) outputHeaders.append('Set-Cookie', value);
    for (const name of ['x-request-id', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) outputHeaders.set(name, value);
    }
    return new Response(upstream.status === 204 ? null : await upstream.text(), {
      status: upstream.status,
      headers: outputHeaders,
    });
  } catch {
    return Response.json(
      {
        code: 'AUTH_UNAVAILABLE',
        message: 'Admin authentication is unavailable.',
        statusCode: 503,
        requestId: randomUUID(),
      },
      { status: 503 },
    );
  }
}
export const GET = relay;
export const POST = relay;
