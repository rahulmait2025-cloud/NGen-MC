import 'server-only';
import { createClient } from '@/lib/supabase/server';

interface SecurityEventInput {
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  collegeId?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Logs security/audit events through the SECURITY DEFINER RPC so apps can audit
 * auth flows without needing the service-role key.
 */
export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('log_security_event', {
    p_action: input.action,
    p_resource_type: input.resourceType ?? 'auth',
    p_resource_id: input.resourceId ?? null,
    p_college_id: input.collegeId ?? null,
    p_payload: input.payload ?? {},
  });

  if (error) {
    // Non-fatal by design: auth flow should not break if logging fails.
    console.error('[security-event] failed to write audit log', error.message);
  }
}
