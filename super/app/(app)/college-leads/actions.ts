'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  updateCollegeLead,
  deleteCollegeLead,
  exportLeadsCSV,
  type UpdateLeadInput,
  type LeadFilters,
} from '@/lib/services/college-leads';
import { requireAuth } from '@/lib/auth/require-superadmin-action';
import { consumeRateLimit } from '@/lib/security/rate-limit';

const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'demo_scheduled', 'converted', 'closed', 'spam']);
const leadPrioritySchema = z.enum(['low', 'medium', 'high']);
const leadIdSchema = z.uuid('Lead ID is required.');
const updateLeadSchema = z.object({
  id: leadIdSchema,
  status: leadStatusSchema.optional(),
  priority: leadPrioritySchema.optional(),
  notes: z.string().trim().max(2000, 'Notes are too long.').nullable().optional(),
  last_contacted_at: z.iso.datetime({ offset: true }).optional(),
  mark_contacted: z.boolean().optional(),
});
const deleteLeadSchema = z.object({ id: leadIdSchema });
const exportFiltersSchema = z.object({
  status: leadStatusSchema.optional(),
  priority: leadPrioritySchema.optional(),
  interest_type: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
}).optional();
const bulkUpdateSchema = z.object({
  ids: z.array(leadIdSchema).min(1, 'At least one lead is required.').max(100, 'Too many leads selected.'),
  status: leadStatusSchema,
});

export async function updateLeadAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth;
    const limited = await consumeRateLimit({
      key: `update-lead:${auth.user.id}`,
      limit: 80,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = updateLeadSchema.safeParse({
      id: formData.get('id'),
      status: formData.get('status') || undefined,
      priority: formData.get('priority') || undefined,
      notes: formData.get('notes') === null ? undefined : String(formData.get('notes') || '').trim() || null,
      last_contacted_at: formData.get('last_contacted_at') || undefined,
      mark_contacted: formData.get('mark_contacted') === 'true',
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    const updates: UpdateLeadInput = {};
    if (parsed.data.status) updates.status = parsed.data.status as UpdateLeadInput['status'];
    if (parsed.data.priority) updates.priority = parsed.data.priority as UpdateLeadInput['priority'];
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.last_contacted_at) updates.last_contacted_at = parsed.data.last_contacted_at;

    if (parsed.data.mark_contacted) {
      updates.last_contacted_at = new Date().toISOString();
      if (!updates.status || updates.status === 'new') {
        updates.status = 'contacted';
      }
    }

    await updateCollegeLead(parsed.data.id, updates);
    revalidatePath('/college-leads');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return { ok: false, error: message };
  }
}

export async function deleteLeadAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth;
    const limited = await consumeRateLimit({
      key: `delete-lead:${auth.user.id}`,
      limit: 40,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = deleteLeadSchema.safeParse({ id: formData.get('id') });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    await deleteCollegeLead(parsed.data.id);
    revalidatePath('/college-leads');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return { ok: false, error: message };
  }
}

export async function exportLeadsAction(
  filters?: LeadFilters
): Promise<{ ok: boolean; csv?: string; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth;
    const limited = await consumeRateLimit({
      key: `export-leads:${auth.user.id}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = exportFiltersSchema.safeParse(filters);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid filters.' };

    const csv = await exportLeadsCSV(parsed.data);
    return { ok: true, csv };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return { ok: false, error: message };
  }
}

export async function bulkUpdateStatusAction(
  ids: string[],
  status: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth;
    const limited = await consumeRateLimit({
      key: `bulk-update-leads:${auth.user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) return { ok: false, error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` };

    const parsed = bulkUpdateSchema.safeParse({ ids, status });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

    await Promise.all(parsed.data.ids.map((id) => updateCollegeLead(id, { status: parsed.data.status as UpdateLeadInput['status'] })));
    revalidatePath('/college-leads');
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk update failed';
    return { ok: false, error: message };
  }
}
