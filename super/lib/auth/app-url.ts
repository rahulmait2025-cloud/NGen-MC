export type Portal = "student" | "college_admin" | "superadmin";

function cleanUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function getVercelUrl(): string | null {
  return cleanUrl(
    process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL ?? null,
  );
}

function getPortalEnvUrl(portal: Portal): string | null {
  if (portal === "student") {
    return cleanUrl(
      process.env.NEXT_PUBLIC_LMS_URL ??
        process.env.NEXT_PUBLIC_LMS_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        getVercelUrl(),
    );
  }
  if (portal === "college_admin") {
    return cleanUrl(
      process.env.NEXT_PUBLIC_COLLEGE_URL ??
        process.env.NEXT_PUBLIC_COLLEGE_ADMIN_URL ??
        process.env.NEXT_PUBLIC_COLLEGE_ADMIN_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        getVercelUrl(),
    );
  }
  return cleanUrl(
    process.env.NEXT_PUBLIC_SUPERADMIN_URL ??
      process.env.NEXT_PUBLIC_SUPERADMIN_APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      getVercelUrl(),
  );
}

export function getClientBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return getPortalEnvUrl("superadmin") ?? "";
}

function getPortalBaseUrl(
  portal: Portal,
  fallbackOrigin?: string,
): string {
  return (
    cleanUrl(fallbackOrigin) ?? getPortalEnvUrl(portal) ?? getClientBaseUrl()
  );
}

export function getAuthRedirectUrl(portal: Portal, origin?: string): string {
  const base = getPortalBaseUrl(portal, origin);
  return `${base}/auth/callback`;
}

/** Student LMS origin for invite links (server-safe; avoids super-admin fallback). */
export function getStudentPortalBaseUrl(): string {
  return (
    getPortalEnvUrl('student') ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : '')
  );
}
