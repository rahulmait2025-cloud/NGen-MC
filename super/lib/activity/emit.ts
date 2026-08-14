import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { ActivityEventName } from '@/lib/activity/event-types';
import { EVENT_NAME_TO_CATEGORY } from '@/lib/activity/event-types';

export interface TrackActivityInput {
  tenantId: string | null;
  actorUserId: string | null;
  actorRole?: string | null;
  actorType?: string | null;
  eventName: ActivityEventName;
  eventCategory?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
}

/**
 * Emit an activity event. Uses RPC so it works with authenticated or anon context.
 * Non-fatal on failure so callers (e.g. login) are not blocked.
 */
export async function trackActivity(input: TrackActivityInput): Promise<string | null> {
  const category = input.eventCategory ?? EVENT_NAME_TO_CATEGORY[input.eventName] ?? 'user';
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('insert_activity_event', {
    p_tenant_id: input.tenantId,
    p_actor_user_id: input.actorUserId,
    p_actor_role: input.actorRole ?? null,
    p_actor_type: input.actorType ?? null,
    p_event_name: input.eventName,
    p_event_category: category,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_metadata: input.metadata ?? {},
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
    p_session_id: input.sessionId ?? null,
    p_request_id: input.requestId ?? null,
  });
  if (error) {
    console.error('[activity] insert_activity_event failed', error.message);
    return null;
  }
  return data as string | null;
}
