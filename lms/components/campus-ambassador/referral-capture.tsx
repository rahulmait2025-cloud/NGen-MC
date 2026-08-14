'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const REFERRAL_STORAGE_KEY = 'lms_referral_code:v1';

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    if (!refCode?.trim()) return;
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode.trim().toUpperCase());
    } catch {
      // ignore storage failures
    }
  }, [refCode]);

  return null;
}

export function readStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}
