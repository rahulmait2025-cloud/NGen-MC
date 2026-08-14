import type { ReactNode } from 'react';
import { ensureEmailCenterDynamic } from '@/lib/email-center/cache';

export default async function EmailCenterLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  await ensureEmailCenterDynamic();
  return children;
}
