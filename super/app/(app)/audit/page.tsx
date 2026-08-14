import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AuditTable } from './_components/AuditTable';

const MAX_FETCH = 1000;

type AuditLogRow = {
  id: string;
  created_at: string;
  severity: string;
  action: string;
  actor_email?: string;
  resource_type: string;
  college_name?: string;
  payload?: Record<string, unknown>;
};

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted/20 animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-muted/20 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

async function AuditContent() {
  const supabase = await createClient();

  const { data: auditLogs, error } = await supabase
    .from('vw_audit_dashboard')
    .select('id, created_at, severity, action, actor_email, resource_type, college_name, payload')
    .order('created_at', { ascending: false })
    .limit(MAX_FETCH);

  const rows: AuditLogRow[] = (auditLogs ?? []) as AuditLogRow[];

  return <AuditTable rows={rows} error={error?.message ?? null} total={rows.length} />;
}

export default async function AuditDashboardPage(): Promise<ReactNode> {
  return (
    <Suspense fallback={<AuditSkeleton />}>
      <AuditContent />
    </Suspense>
  );
}
