import { healthResponseSchemaFor } from '../../../src/lib/contracts';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';
    const upstream = await fetch(new URL('/v1/health', base), {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!upstream.ok) throw new Error('API unavailable');
    const health = healthResponseSchemaFor('trusted-assistance-admin-api').parse(
      await upstream.json(),
    );
    return Response.json(health);
  } catch {
    return Response.json(
      { message: 'API unavailable. Start the local API and check its environment.' },
      { status: 503 },
    );
  }
}
