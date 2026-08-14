import type { ReactNode } from 'react';
import { getTpOperationalSummaryAction } from '../actions';
import { TpAnalyticsClient } from './analytics-client';

export default async function TpAnalyticsPage(): Promise<ReactNode> {
  const res = await getTpOperationalSummaryAction();
  const summary = res.ok ? (res.data as {
    assets: { total: number; processing: number; failed: number };
    webhooks: { recent_24h: number; failures_24h: number };
  }) : null;

  return <TpAnalyticsClient initialSummary={summary} />;
}
