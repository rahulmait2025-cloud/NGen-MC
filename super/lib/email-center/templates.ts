import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getSupabaseErrorMessage,
  isTransientSupabaseFetchError,
  logTransientSupabaseDegradation,
} from '@/lib/supabase/fetch-resilience';
import type { EmailTemplate, EmailTemplateCategory } from './types';

export async function listActiveTemplates(): Promise<EmailTemplate[]> {
  const admin = createAdminClient();

  try {
    const { data, error } = await admin
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      const message = error.message ?? getSupabaseErrorMessage(error);
      if (isTransientSupabaseFetchError(message)) {
        logTransientSupabaseDegradation('listActiveTemplates', error);
        throw new Error('Database connection failed. Please refresh and try again.');
      }
      console.error('[email-center] listActiveTemplates error:', message);
      throw new Error(`Failed to list templates: ${message}`);
    }

    if (process.env.NODE_ENV === 'development' && (!data || data.length === 0)) {
      console.warn('[email-center] listActiveTemplates returned 0 rows — table may be empty or query filtering wrong');
    }

    return (data ?? []) as EmailTemplate[];
  } catch (err) {
    if (err instanceof Error && (
      err.message.startsWith('Failed to list templates')
      || err.message.includes('Database connection failed')
    )) {
      throw err;
    }
    const message = getSupabaseErrorMessage(err);
    if (isTransientSupabaseFetchError(message)) {
      logTransientSupabaseDegradation('listActiveTemplates', err);
      throw new Error('Database connection failed. Please refresh and try again.');
    }
    console.error('[email-center] listActiveTemplates error:', message);
    throw new Error(`Failed to list templates: ${message}`);
  }
}

 
async function _listTemplatesByCategory(
  category: EmailTemplateCategory
): Promise<EmailTemplate[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_templates')
    .select('*')
    .eq('is_active', true)
    .eq('category', category)
    .order('name', { ascending: true });

  if (error) {
    console.error('[email-center] listTemplatesByCategory error:', error.message);
    throw new Error(`Failed to list templates by category: ${error.message}`);
  }

  return (data ?? []) as EmailTemplate[];
}

export async function getTemplateById(id: string): Promise<EmailTemplate | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[email-center] getTemplateById error:', error.message);
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data as EmailTemplate;
}

 
async function _getTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[email-center] getTemplateBySlug error:', error.message);
    throw new Error(`Failed to get template: ${error.message}`);
  }

  return data as EmailTemplate;
}

async function _getAllTemplates(): Promise<EmailTemplate[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('email_templates')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('[email-center] getAllTemplates error:', error.message);
    throw new Error(`Failed to get all templates: ${error.message}`);
  }

  if (process.env.NODE_ENV === 'development' && (!data || data.length === 0)) {
    console.warn('[email-center] getAllTemplates returned 0 rows — table may be empty');
  }

  return (data ?? []) as EmailTemplate[];
}

 
async function _getTemplateCount(): Promise<number> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('email_templates')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) {
    console.error('[email-center] getTemplateCount error:', error.message);
    throw new Error(`Failed to count templates: ${error.message}`);
  }

  return count ?? 0;
}