import 'server-only';

export type StudentAuthFreshness = 'cached' | 'fresh';
export type StudentAuthAssurance = 'standard' | 'sensitive';

export type StudentRuntimeOptions = {
  freshness?: StudentAuthFreshness;
  assurance?: StudentAuthAssurance;
};

export type StudentTenantKind = 'college' | 'direct';

export type StudentRuntime = {
  identity: {
    userId: string;
    email: string | null;
    fullName: string | null;
  };

  student: {
    studentId: string;
    membershipId: string;
    membershipStatus?: string | null;
  };

  tenant: {
    kind: StudentTenantKind;
    collegeId: string;
    routeSlug: string;
    claimSlug: string | null;
    resolvedSlug: string | null;
    isGlobal: boolean;
  };

  auth: {
    source:
      | 'claims-fast-path'
      | 'authorization-cache'
      | 'authorization-rpc'
      | 'sensitive-auth-user-and-rpc';
    freshness: StudentAuthFreshness;
    assurance: StudentAuthAssurance;
  };
};

export type VerifiedIdentity = {
  userId: string;
  email: string | null;
  fullName: string | null;
  globalRole: string | null;
};
