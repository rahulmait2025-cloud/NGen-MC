import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  TeamListFilters,
  TeamMemberListItem,
  TeamMemberRow,
  TeamMemberSummary,
} from './types';

const LIST_COLUMNS =
  'id,name,slug,role,short_role,photo_path,photo_alt_text,is_founder,is_featured,is_published,display_order,updated_at';

export async function listTeamMembers(
  filters: TeamListFilters = {},
): Promise<{ members: TeamMemberListItem[]; summary: TeamMemberSummary }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('team_members')
    .select(LIST_COLUMNS)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const all = (data ?? []) as TeamMemberListItem[];
  const search = filters.search?.trim().toLowerCase() ?? '';

  const filtered = all.filter((member) => {
    if (filters.published === 'published' && !member.is_published) return false;
    if (filters.published === 'draft' && member.is_published) return false;
    if (filters.featured === 'featured' && !member.is_featured) return false;
    if (filters.featured === 'not_featured' && member.is_featured) return false;
    if (!search) return true;
    const haystack = `${member.name} ${member.role} ${member.short_role ?? ''}`.toLowerCase();
    return haystack.includes(search);
  });

  const summary: TeamMemberSummary = {
    total: all.length,
    published: all.filter((m) => m.is_published).length,
    draft: all.filter((m) => !m.is_published).length,
    featured: all.filter((m) => m.is_featured).length,
  };

  return { members: filtered, summary };
}

export async function getTeamMemberById(id: string): Promise<TeamMemberRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('team_members')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as TeamMemberRow | null) ?? null;
}

export async function getExistingTeamMemberSlugs(
  excludeId?: string,
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('team_members').select('id,slug');
  if (error) throw new Error(error.message);

  const slugs = new Set<string>();
  for (const row of data ?? []) {
    if (excludeId && row.id === excludeId) continue;
    slugs.add(row.slug);
  }
  return slugs;
}
