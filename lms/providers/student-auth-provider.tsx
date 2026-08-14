'use client';

import React, { createContext, use, useMemo } from 'react';
import type { CurrentTenant, CurrentMembership } from '@/lib/tenant/get-tenant';

export interface StudentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

export interface StudentAuthContextType {
  user: StudentUser | null;
  tenant: CurrentTenant | null;
  membership: CurrentMembership | null;
  studentId: string | null;
  isGlobal: boolean;
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null);

export function StudentAuthProvider({
  initialUser,
  context,
  children,
}: {
  initialUser?: StudentUser | null;
  context?: {
    user: StudentUser;
    tenant: CurrentTenant;
    membership: CurrentMembership;
    studentId: string;
    isGlobal: boolean;
  } | null;
  children: React.ReactNode;
}) {
  const value = useMemo<StudentAuthContextType>(() => {
    if (context) {
      return {
        user: context.user,
        tenant: context.tenant,
        membership: context.membership,
        studentId: context.studentId,
        isGlobal: context.isGlobal,
      };
    }
    return {
      user: initialUser ?? null,
      tenant: null,
      membership: null,
      studentId: null,
      isGlobal: false,
    };
  }, [context, initialUser]);

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentContext(): StudentAuthContextType {
  const context = use(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentContext must be used within a StudentAuthProvider');
  }
  return context;
}

export function useStudentAuth(): StudentUser | null {
  const context = use(StudentAuthContext);
  return context ? context.user : null;
}

