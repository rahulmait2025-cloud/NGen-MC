import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface ActivityEventRow {
  id: string;
  tenant_id: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_type: string | null;
  event_name: string;
  event_category: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  request_id: string | null;
  created_at: string;
}

export interface ActivityEventWithActor extends ActivityEventRow {
  actor_name: string | null;
  actor_email: string | null;
}

export interface ListActivityEventsParams {
  tenantId?: string | null;
  userId?: string | null;
  eventName?: string | null;
  eventCategory?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
}

const ACTIVITY_CACHE_TTL_MS = 15_000;
const activityCache = new Map<string, { data: ActivityEventWithActor[]; expiresAt: number }>();

function getCacheKey(params: ListActivityEventsParams): string {
  return JSON.stringify(params);
}

export async function listActivityEventsWithActors(
  params: ListActivityEventsParams = {},
): Promise<ActivityEventWithActor[]> {
  const cacheKey = getCacheKey(params);
  const cached = activityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { tenantId, userId, eventName, eventCategory, from, to, limit = 100 } = params;
  const supabase = await createClient();

  let q = supabase
    .from('activity_events')
    .select(`
      id, tenant_id, actor_user_id, actor_role, actor_type, event_name, event_category,
      entity_type, entity_id, metadata, ip_address, user_agent, session_id, request_id, created_at,
      profiles:actor_user_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 500));

  if (tenantId) q = q.eq('tenant_id', tenantId);
  if (userId) q = q.eq('actor_user_id', userId);
  if (eventName) q = q.eq('event_name', eventName);
  if (eventCategory) q = q.eq('event_category', eventCategory);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const results: ActivityEventWithActor[] = (data ?? []).map((row: Record<string, unknown> & { profiles?: Array<{ full_name?: string; email?: string }> | null }) => ({
    id: String(row.id),
    tenant_id: row.tenant_id as string | null,
    actor_user_id: row.actor_user_id as string | null,
    actor_role: row.actor_role as string | null,
    actor_type: row.actor_type as string | null,
    event_name: String(row.event_name),
    event_category: String(row.event_category),
    entity_type: row.entity_type as string | null,
    entity_id: row.entity_id as string | null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    ip_address: row.ip_address as string | null,
    user_agent: row.user_agent as string | null,
    session_id: row.session_id as string | null,
    request_id: row.request_id as string | null,
    created_at: String(row.created_at),
    actor_name: row.profiles?.[0]?.full_name ?? null,
    actor_email: row.profiles?.[0]?.email ?? null,
  }));

  activityCache.set(cacheKey, { data: results, expiresAt: Date.now() + ACTIVITY_CACHE_TTL_MS });
  return results;
}
