'use client';

import React, { createContext, useState, useCallback, useMemo } from 'react';
import { useStudentContext } from '@/providers/student-auth-provider';
import { LoginRequiredDialog } from './login-required-dialog';

interface RequireAuthArgs {
  intent: string;
  returnTo: string;
}

interface AuthGateContextType {
  requireAuth: (args: RequireAuthArgs) => boolean;
}

export const AuthGateContext = createContext<AuthGateContextType | null>(null);

function copyForIntent(intent: string): { title: string; description: string } {
  switch (intent) {
    case 'Enroll':
      return {
        title: 'Login to continue',
        description: 'Login to enroll and track your progress in this course.',
      };
    case 'Purchase':
      return {
        title: 'Login to continue',
        description: 'Login to complete your purchase and start learning.',
      };
    default: {
      const destination = intent?.trim();
      if (destination && destination !== 'Login Required') {
        return {
          title: 'Login to continue',
          description: `Login to open ${destination}.`,
        };
      }
      return {
        title: 'Login to continue',
        description: 'Login to continue where you left off.',
      };
    }
  }
}

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const context = useStudentContext();
  const user = context ? context.user : null;

  const [isOpen, setIsOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('Login to continue');
  const [dialogDescription, setDialogDescription] = useState(
    'Login to continue where you left off.'
  );

  const requireAuth = useCallback(
    ({ intent }: RequireAuthArgs): boolean => {
      if (user) {
        return true;
      }

      const copy = copyForIntent(intent || '');
      setDialogTitle(copy.title);
      setDialogDescription(copy.description);
      setIsOpen(true);
      return false;
    },
    [user]
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <LoginRequiredDialog
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        title={dialogTitle}
        description={dialogDescription}
      />
    </AuthGateContext.Provider>
  );
}
