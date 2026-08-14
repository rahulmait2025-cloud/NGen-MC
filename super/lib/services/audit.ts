/**
 * Audit log read/write operations.
 *
 * RLS BYPASS: Yes — uses createAdminClient() (service-role key).
 * AUTH GUARD:
 *   - logAudit(): None — intentionally unguarded so any server module can
 *     emit audit entries. Callers are trusted server code, not user input.
 *   - listAuditLogs(): None at this level. Callers (dashboard.ts, ops-pages.ts)
 *     must invoke requireSuperadmin() before calling this function.
 * TENANT SCOPE: logAudit accepts optional college_id. listAuditLogs returns
 *               cross-tenant data — callers must be SuperAdmin only.
 */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditLogInput {
  actor_id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  college_id?: string | null;
  payload?: Record<string, unknown> | null;
}

/** Insert an audit log entry (server-only; uses service role). */
export async function logAudit(input: AuditLogInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_logs').insert({
    actor_id: input.actor_id,
    action: input.action,
    resource_type: input.resource_type ?? null,
    resource_id: input.resource_id ?? null,
    college_id: input.college_id ?? null,
    payload: input.payload ?? null,
  });
  if (error) throw new Error(error.message);
}

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  college_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

/** List audit logs (SuperAdmin only; uses service role). Most recent first. */
export async function listAuditLogs(opts?: { limit?: number }): Promise<AuditLogItem[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 100;
  const { data, error } = await admin
    .from('audit_logs')
    .select('id, actor_id, action, resource_type, resource_id, college_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    actor_id: row.actor_id,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    college_id: row.college_id,
    payload: row.payload as Record<string, unknown> | null,
    created_at: row.created_at,
  }));
}
