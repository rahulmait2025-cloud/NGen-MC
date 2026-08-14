import { Suspense } from 'react';
import { requireStudent } from '@/lib/auth/require-student';
import { isCampusAmbassadorCached } from '@/lib/services/campus-ambassador';
import { StudentAuthProvider } from '@/providers/student-auth-provider';
import { AuthenticatedClientLayout } from './client-layout';
import { StudentLandingFooter } from './home/_components/student-landing-footer';

/**
 * Authenticated layout — streams shell instantly.
 *
 * The auth call (requireStudent) uses DB internally.
 * Wrapped in Suspense so Next.js allows the DB call — shell renders
 * immediately via streaming, no full-page skeleton.
 */
export default function StudentAuthenticatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedLayoutInner params={params}>
        {children}
      </AuthenticatedLayoutInner>
    </Suspense>
  );
}

async function AuthenticatedLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  const ctx = await requireStudent(collegeSlug);
  const { user, tenant, isGlobal } = ctx;

  // Check if user is an active campus ambassador with an active coupon
  let isAmbassador = false;
  try {
    isAmbassador = await isCampusAmbassadorCached(user.id);
  } catch {
    // Silently fail — sidebar just won't show ambassador link
  }

  return (
    <StudentAuthProvider
      context={ctx}
    >
      <AuthenticatedClientLayout
        tenantName={tenant.name}
        visiblePillars={[]}
        isGlobal={isGlobal}
        studentName={user.fullName ?? undefined}
        isAmbassador={isAmbassador}
        footer={<StudentLandingFooter collegeSlug={collegeSlug} />}
      >
        {children}
      </AuthenticatedClientLayout>
    </StudentAuthProvider>
  );
}

/**
 * Minimal shell shown while auth resolves.
 * No skeleton — just the sidebar + header structure (CSS animate-pulse).
 * Static page content below the header is NOT blocked by this fallback.
 */
function ShellFallback() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block w-64 border-r border-border/40 bg-muted/5 animate-pulse" />
      <div className="flex-1">
        <div className="h-14 border-b border-border/40 bg-muted/5 animate-pulse" />
      </div>
    </div>
  );
}