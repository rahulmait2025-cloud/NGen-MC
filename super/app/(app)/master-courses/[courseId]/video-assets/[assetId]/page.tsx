import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getVideoAssetById } from '@/lib/services/video-assets';
import { AssetEnhancementClient } from './asset-client';

export default async function VideoAssetEnhancementPage({
  params,
}: {
  params: Promise<{ courseId: string; assetId: string }>;
}): Promise<ReactNode> {
  const { courseId, assetId } = await params;
  const [_auth, asset] = await Promise.all([
    getSessionFromHeaders(),
    getVideoAssetById(assetId),
  ]);
  if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  if (!asset || asset.master_course_id !== courseId) {
    notFound();
  }

  return (
    <AssetEnhancementClient
      courseId={courseId}
      asset={asset}
    />
  );
}
