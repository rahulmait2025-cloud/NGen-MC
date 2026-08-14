import 'server-only';

function cleanUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

function getVercelUrl(): string | null {
  return cleanUrl(process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL ?? null);
}

function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** Canonical Student LMS base URL for transactional email links (never localhost in production). */
export function getStudentAppBaseUrl(): string {
  const fromEnv = cleanUrl(
    process.env.NEXT_PUBLIC_STUDENT_APP_URL
    ?? process.env.STUDENT_APP_URL
    ?? process.env.NEXT_PUBLIC_LMS_URL
    ?? process.env.NEXT_PUBLIC_LMS_APP_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? getVercelUrl(),
  );

  if (fromEnv) {
    if (
      process.env.NODE_ENV === 'production'
      && !isNextProductionBuild()
      && /localhost|127\.0\.0\.1/i.test(fromEnv)
    ) {
      throw new Error(
        'Student app URL resolves to localhost in production. Set NEXT_PUBLIC_STUDENT_APP_URL or NEXT_PUBLIC_LMS_URL.',
      );
    }
    return fromEnv;
  }

  if (process.env.NODE_ENV === 'development' || isNextProductionBuild()) {
    return fromEnv ?? 'http://localhost:3002';
  }

  throw new Error(
    'Missing student app URL for email links. Set NEXT_PUBLIC_STUDENT_APP_URL, NEXT_PUBLIC_LMS_URL, or NEXT_PUBLIC_APP_URL.',
  );
}
