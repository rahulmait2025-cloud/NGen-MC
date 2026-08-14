import type { Page, Request, Response } from '@playwright/test';

/** Confirmed B2C / non-partnered tenant from existing public E2E + README (`direct-learners`). */
export const PUBLIC_CATALOG_COLLEGE_SLUG = 'direct-learners';

export const PUBLIC_FREE_COURSES_PATH = `/c/${PUBLIC_CATALOG_COLLEGE_SLUG}/student/free-courses`;
export const PUBLIC_PAID_COURSES_PATH = `/c/${PUBLIC_CATALOG_COLLEGE_SLUG}/student/paid-courses`;
export const PUBLIC_JOB_READY_BOOTCAMP_PATH = `/c/${PUBLIC_CATALOG_COLLEGE_SLUG}/student/bootcamp`;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Business-mutation URL patterns that must not fire on a read-only public catalog load. */
const MUTATION_URL_RE =
  /(?:enroll|unenroll|entitlement|create-order|verify.*payment|razorpay|progress|lesson.?complete|assignment|outbox|transactional.?email|payment.?order)/i;

function isRazorpayTelemetry(url: string): boolean {
  try {
    const target = new URL(url);
    return (
      target.hostname === 'lumberjack.razorpay.com' &&
      target.pathname === '/v2/logz'
    );
  } catch {
    return false;
  }
}

export type PublicCatalogEvidence = {
  requestedPath: string;
  finalUrl: string;
  documentStatus: number | null;
  failedFirstPartyRequests: string[];
  consoleErrors: string[];
  unexpectedMutations: string[];
};

function isFirstParty(url: string): boolean {
  try {
    const target = new URL(url);
    return target.hostname === 'localhost' || target.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function isDevNoise(url: string): boolean {
  return (
    url.includes('/_next/webpack-hmr') ||
    url.includes('/_next/static/') ||
    url.includes('__nextjs') ||
    url.includes('/.well-known/')
  );
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/**
 * Attach console + network monitors for a public catalog page load.
 * Does not log request bodies.
 */
export function attachPublicCatalogMonitors(page: Page): {
  evidence: PublicCatalogEvidence;
  assertNoUnexpectedMutations: () => void;
} {
  const evidence: PublicCatalogEvidence = {
    requestedPath: '',
    finalUrl: '',
    documentStatus: null,
    failedFirstPartyRequests: [],
    consoleErrors: [],
    unexpectedMutations: [],
  };

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Download the React DevTools/i.test(text)) return;
    evidence.consoleErrors.push(text.slice(0, 500));
  });

  page.on('request', (req: Request) => {
    const url = req.url();
    if (isDevNoise(url)) return;
    if (isRazorpayTelemetry(url)) return;
    const method = req.method().toUpperCase();
    if (!MUTATION_METHODS.has(method)) return;

    const headers = req.headers();
    const isServerAction = Boolean(headers['next-action'] ?? headers['Next-Action']);
    if (isServerAction || MUTATION_URL_RE.test(url)) {
      evidence.unexpectedMutations.push(`${method} ${sanitizeUrl(url)}`);
    }
  });

  page.on('response', (res: Response) => {
    const url = res.url();
    if (isDevNoise(url)) return;
    if (res.ok()) return;
    if (!isFirstParty(url)) return;
    evidence.failedFirstPartyRequests.push(`${res.status()} ${sanitizeUrl(url)}`);
  });

  return {
    evidence,
    assertNoUnexpectedMutations() {
      if (evidence.unexpectedMutations.length > 0) {
        throw new Error(
          `Unexpected business mutations during public catalog load:\n${evidence.unexpectedMutations.join('\n')}`,
        );
      }
    },
  };
}

export async function gotoPublicCatalog(
  page: Page,
  path: string,
  evidence: PublicCatalogEvidence,
): Promise<Response | null> {
  evidence.requestedPath = path;
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  evidence.documentStatus = response?.status() ?? null;
  evidence.finalUrl = page.url();
  return response;
}

export async function assertNotAuthOrDashboard(
  page: Page,
  collegeSlug = PUBLIC_CATALOG_COLLEGE_SLUG,
): Promise<void> {
  const url = page.url();
  if (/\/login(\?|$)/.test(url)) {
    throw new Error(`Unexpected redirect to login: ${url}`);
  }
  if (new RegExp(`/c/${collegeSlug}/student/login`).test(url)) {
    throw new Error(`Unexpected redirect to student login: ${url}`);
  }
  if (new RegExp(`/c/${collegeSlug}/student/dashboard`).test(url)) {
    throw new Error(`Unexpected redirect to authenticated dashboard: ${url}`);
  }
}

export async function assertNoCrashCopy(page: Page): Promise<void> {
  await Promise.all([
    expectCountZero(page, 'Application error'),
    expectCountZero(page, 'Internal Server Error'),
    expectCountZero(page, 'Authentication required'),
  ]);
}

async function expectCountZero(page: Page, text: string): Promise<void> {
  const count = await page.getByText(text).count();
  if (count > 0) {
    throw new Error(`Page shows forbidden copy: ${text}`);
  }
}
