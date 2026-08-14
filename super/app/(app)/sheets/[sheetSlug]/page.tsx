import type { ReactNode } from 'react';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getDsaSheetBySlug } from '@/lib/services/dsa-sheet';
import DsaSheetPageClient from '../dsa-sheet-page-client';
import { redirect } from 'next/navigation';

export default async function DsaSheetDetailsPage({
  params,
}: {
  params: Promise<{ sheetSlug: string }>;
}): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    redirect('/login');
  }

  const { sheetSlug } = await params;

  const sheet = await getDsaSheetBySlug(sheetSlug);
  if (!sheet) {
    redirect('/sheets');
  }

  return (
    <div className="space-y-6">
      <DsaSheetPageClient sheetId={sheet.id} />
    </div>
  );
}
