import { cookies } from 'next/headers';
import { z } from 'zod';
export async function adminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access')?.value;
  if (!token) return null;
  try {
    const response = await fetch(
      new URL('/v1/admin/auth/me', process.env.API_BASE_URL ?? 'http://127.0.0.1:4000'),
      {
        headers: { Cookie: `admin_access=${encodeURIComponent(token)}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return null;
    const result = z
      .object({
        user: z.object({
          id: z.uuid(),
          role: z.enum(['ADMIN', 'SUPER_ADMIN']),
          maskedPhone: z.string(),
          onboardingStatus: z.literal('NOT_APPLICABLE'),
        }),
      })
      .safeParse(await response.json());
    return result.success ? result.data.user : null;
  } catch {
    return null;
  }
}
