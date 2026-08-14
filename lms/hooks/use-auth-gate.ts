'use client';

import { useContext } from 'react';
import { AuthGateContext } from '@/components/auth/auth-gate-provider';

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error('useAuthGate must be used within AuthGateProvider');
  }
  return context;
}
