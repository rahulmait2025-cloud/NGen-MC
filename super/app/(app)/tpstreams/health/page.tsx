import type { ReactNode } from 'react';
import { runTpHealthChecksAction } from '../actions';
import { TpHealthClient, type TpHealthChecks } from './health-client';

export default async function TpHealthPage(): Promise<ReactNode> {
  const res = await runTpHealthChecksAction();
  const checks = res.ok ? (res.data as TpHealthChecks) : null;

  return <TpHealthClient initialChecks={checks} />;
}
