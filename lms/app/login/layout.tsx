import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { studentPortalMetadata } from '@/lib/metadata/student-portal';

export const metadata: Metadata = studentPortalMetadata;

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="antialiased">{children}</div>
  );
}
