import type { ReactNode } from 'react';
import { getOptionalStudentContext } from '@/lib/auth/get-optional-student-context';
import { StudentAuthProvider } from '@/providers/student-auth-provider';
import { AuthGateProvider } from '@/components/auth/auth-gate-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ExploreStyleShell } from '../(authenticated)/home/_components/explore-style-shell';
import { StudentLandingFooter } from '../(authenticated)/home/_components/student-landing-footer';

export default async function PublicStudentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  const ctx = await getOptionalStudentContext(collegeSlug);

  return (
    <TooltipProvider>
      <StudentAuthProvider context={ctx}>
        <AuthGateProvider>
          <ExploreStyleShell
            collegeSlug={collegeSlug}
            footer={<StudentLandingFooter collegeSlug={collegeSlug} />}
          >
            {children}
          </ExploreStyleShell>
        </AuthGateProvider>
      </StudentAuthProvider>
    </TooltipProvider>
  );
}
