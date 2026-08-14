import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getSimpleColleges } from '@/lib/services/colleges';
import { BundleForm } from './bundle-form-client';

export default async function CreateBundlePage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }
  const colleges = await getSimpleColleges();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Course Bundle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Package multiple variants, courses, or items together. Bundles never create TPStreams folders.
        </p>
      </div>

      <BundleForm colleges={colleges} />
    </div>
  );
}
