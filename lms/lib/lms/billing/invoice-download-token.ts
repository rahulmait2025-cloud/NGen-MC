import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const TOKEN_TTL_DAYS = 7;

function hashInvoiceDownloadToken(plainToken: string): string {
  return createHash('sha256').update(plainToken, 'utf8').digest('hex');
}

function generatePlainInvoiceDownloadToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createInvoiceDownloadToken(invoiceId: string): Promise<{
  plainToken: string;
  expiresAt: string;
}> {
  const admin = createAdminClient();
  const plainToken = generatePlainInvoiceDownloadToken();
  const tokenHash = hashInvoiceDownloadToken(plainToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from('lms_invoice_download_tokens').insert({
    invoice_id: invoiceId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  return { plainToken, expiresAt };
}

export async function resolveInvoiceIdByDownloadToken(plainToken: string): Promise<string | null> {
  const admin = createAdminClient();
  const tokenHash = hashInvoiceDownloadToken(plainToken);

  const { data, error } = await admin
    .from('lms_invoice_download_tokens')
    .select('invoice_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;

  return data.invoice_id as string;
}
