import 'server-only';

import React from 'react';
import type { ModuleId } from '@/lib/modules/module-registry';

/**
 * Module access guard. Always returns unlocked since access control
 * is handled at the layout level via ProtectedDataProvider.
 *
 * Kept for API compatibility with existing page callers.
 */
export async function guardModulePage(
  _collegeId: string,
  _moduleId: ModuleId,
): Promise<{ locked: false; node?: React.ReactNode }> {
  return { locked: false };
}
