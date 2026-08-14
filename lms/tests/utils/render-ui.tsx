import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import {
  StudentAuthProvider,
  type StudentUser,
} from '@/providers/student-auth-provider';
import { AuthGateContext } from '@/components/auth/auth-gate-provider';
import type { CurrentMembership, CurrentTenant } from '@/lib/tenant/get-tenant';

export type RenderUiAuth = {
  user?: StudentUser | null;
  tenantSlug?: string;
  authenticated?: boolean;
};

type RenderUiOptions = Omit<RenderOptions, 'wrapper'> & {
  auth?: RenderUiAuth;
};

function buildAuthContext(auth?: RenderUiAuth) {
  const authenticated = auth?.authenticated ?? Boolean(auth?.user);
  const user = authenticated
    ? (auth?.user ?? {
        id: 'student-test-id',
        email: 'rahul@example.com',
        fullName: 'Rahul Kumar',
        isActive: true,
      })
    : (auth?.user ?? null);

  if (!user) {
    return {
      initialUser: null as StudentUser | null,
      context: null as null,
    };
  }

  const tenantSlug = auth?.tenantSlug ?? 'nextgen';
  const tenant: CurrentTenant = {
    id: 'tenant-test-id',
    slug: tenantSlug,
    name: 'NextGen',
    shortName: 'NG',
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
  };
  const membership: CurrentMembership = {
    id: 'membership-test-id',
    role: 'student',
    collegeId: 'college-test-id',
    status: 'active',
  };

  return {
    initialUser: user,
    context: {
      user,
      tenant,
      membership,
      studentId: user.id,
      isGlobal: tenantSlug === 'direct-learners',
    },
  };
}

/**
 * Provider shell for auth transitions via `rerender` without unmounting the tree root.
 * Theme is stubbed at the ThemeToggle boundary in UI tests (not next-themes).
 */
export function UiProviders({
  auth,
  children,
}: {
  auth?: RenderUiAuth;
  children: ReactNode;
}) {
  const { initialUser, context } = buildAuthContext(auth);
  const requireAuth = () => false;

  return (
    <StudentAuthProvider initialUser={initialUser} context={context}>
      <AuthGateContext.Provider value={{ requireAuth }}>
        {children}
      </AuthGateContext.Provider>
    </StudentAuthProvider>
  );
}

/**
 * Render Student LMS UI with lightweight, controlled providers.
 * No Supabase, cookies, or real credentials.
 */
export function renderUi(ui: ReactElement, options: RenderUiOptions = {}) {
  const { auth, ...renderOptions } = options;
  return render(<UiProviders auth={auth}>{ui}</UiProviders>, renderOptions);
}

export function authenticatedRahulAuth(
  overrides?: Partial<StudentUser>,
): RenderUiAuth {
  return {
    authenticated: true,
    tenantSlug: 'nextgen',
    user: {
      id: 'student-rahul',
      email: 'rahul@example.com',
      fullName: 'Rahul Kumar',
      isActive: true,
      ...overrides,
    },
  };
}

export function anonymousAuth(): RenderUiAuth {
  return {
    authenticated: false,
    user: null,
    tenantSlug: 'nextgen',
  };
}
