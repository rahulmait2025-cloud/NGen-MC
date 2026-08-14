import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listDsaSheets } from '@/lib/services/dsa-sheet';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { DsaSheetsListClient } from './_components/dsa-sheets-list-client';

function SheetsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function SheetsContent() {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const [sheets, settings] = await Promise.all([
    listDsaSheets(),
    getPlatformSettings(),
  ]);

  return (
    <div className="space-y-6">
      <DsaSheetsListClient
        initialSheets={sheets}
        initialReadme={settings.dsa_readme_markdown || ''}
      />
    </div>
  );
}

export default async function DsaSheetsPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<SheetsSkeleton />}>
      <SheetsContent />
    </Suspense>
  );
}

