import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { listPlacementRows } from '@/lib/services/ops-pages';

const PlacementsPage = dynamic(
  () => import('@/components/pages/placements').then((m) => ({ default: m.PlacementsPage })),
  { ssr: true }
);

export default async function PlacementsRoute(): Promise<ReactNode> {
  const rows = await listPlacementRows();
  return <PlacementsPage rows={rows} />;
}