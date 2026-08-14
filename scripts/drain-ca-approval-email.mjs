/**
 * One-shot: drain Stage lms_email_outbox rows for campus_ambassador_approval.
 * Loads lms/.env; sends via Resend REST API; writes evidence JSON (masked emails).
 *
 * Usage from repo root:
 *   node scripts/drain-ca-approval-email.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(
  ROOT,
  'lms',
  'docs',
  'evidence',
  'lifecycle-stage-verification',
  'defects',
  'ca-approval-email-drain.json',
);
const require = createRequire(path.join(ROOT, 'lms', 'package.json'));
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const localMask = local.length <= 2 ? local[0] + '***' : local.slice(0, 2) + '***';
  return `${localMask}@${domain}`;
}

function maskId(id) {
  if (!id || typeof id !== 'string') return null;
  if (id.length <= 8) return id.slice(0, 2) + '...';
  return id.slice(0, 4) + '...' + id.slice(-4);
}

loadEnvFile(path.join(ROOT, 'lms', '.env'));

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendKey = process.env.RESEND_API_KEY || '';
const emailFrom = (process.env.EMAIL_FROM || '').trim();
const emailProvider = (process.env.EMAIL_PROVIDER || 'resend').trim().toLowerCase();

const evidence = {
  started_at: new Date().toISOString(),
  supabase_host: null,
  email_provider_env: emailProvider,
  email_from_set: Boolean(emailFrom),
  resend_key_set: Boolean(resendKey),
  query: {
    event_type: 'campus_ambassador_approval',
    status_in: ['queued', 'failed'],
    attempts_lt: 5,
  },
  candidates_found: 0,
  results: [],
  summary: { sent: 0, failed: 0, skipped: 0 },
  errors: [],
  finished_at: null,
};

try {
  evidence.supabase_host = new URL(supabaseUrl).host;
} catch {
  evidence.supabase_host = null;
}

async function sendViaResend({ to, subject, html, text }) {
  const body = {
    from: emailFrom,
    to: [to],
    subject,
    html: html || (text ? `<pre>${text}</pre>` : ''),
  };
  if (text) body.text = text;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.error || json.name)) ||
      rawText.slice(0, 200) ||
      `HTTP ${res.status}`;
    return { ok: false, status: res.status, errorMessage: String(msg), messageId: null };
  }

  const messageId = json?.id ?? null;
  return { ok: true, status: res.status, errorMessage: null, messageId };
}

async function main() {
  if (!supabaseUrl || !serviceKey) {
    evidence.errors.push('Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY');
    evidence.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  if (emailProvider !== 'resend') {
    evidence.errors.push(`EMAIL_PROVIDER is ${emailProvider}, expected resend`);
  }
  if (!resendKey || !emailFrom) {
    evidence.errors.push('Missing RESEND_API_KEY or EMAIL_FROM');
    evidence.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    console.error('Missing Resend credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error: selectError } = await supabase
    .from('lms_email_outbox')
    .select(
      'id, event_type, status, to_email, subject, html_body, text_body, attempts, idempotency_key, created_at, last_error',
    )
    .eq('event_type', 'campus_ambassador_approval')
    .in('status', ['queued', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true });

  if (selectError) {
    evidence.errors.push(selectError.message);
    evidence.finished_at = new Date().toISOString();
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    console.error('Select failed:', selectError.message);
    process.exit(1);
  }

  const candidates = rows ?? [];
  evidence.candidates_found = candidates.length;
  console.log(`Found ${candidates.length} candidate outbox row(s)`);

  for (const row of candidates) {
    const entry = {
      id: maskId(row.id),
      status_before: row.status,
      attempts_before: row.attempts,
      to_email_masked: maskEmail(row.to_email),
      subject: row.subject ? String(row.subject).slice(0, 80) : null,
      idempotency_key: row.idempotency_key
        ? String(row.idempotency_key).replace(
            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
            (m) => maskId(m),
          )
        : null,
      outcome: null,
      provider_message_id: null,
      error: null,
    };

    try {
      const sendResult = await sendViaResend({
        to: row.to_email,
        subject: row.subject,
        html: row.html_body,
        text: row.text_body,
      });

      const attempts = (row.attempts ?? 0) + 1;

      if (sendResult.ok) {
        const { error: updateError } = await supabase
          .from('lms_email_outbox')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: 'resend',
            provider_message_id: sendResult.messageId,
            attempts,
            last_error: null,
            locked_at: null,
            locked_by: null,
          })
          .eq('id', row.id);

        if (updateError) {
          entry.outcome = 'failed';
          entry.error = `sent_but_update_failed: ${updateError.message}`;
          evidence.summary.failed += 1;
        } else {
          entry.outcome = 'sent';
          entry.provider_message_id = sendResult.messageId
            ? maskId(String(sendResult.messageId))
            : null;
          evidence.summary.sent += 1;
        }
      } else {
        const { error: updateError } = await supabase
          .from('lms_email_outbox')
          .update({
            status: 'failed',
            attempts,
            last_error: sendResult.errorMessage ?? 'send_failed',
            locked_at: null,
            locked_by: null,
          })
          .eq('id', row.id);

        entry.outcome = 'failed';
        entry.error = sendResult.errorMessage ?? 'send_failed';
        if (updateError) {
          entry.error += `; update_failed: ${updateError.message}`;
        }
        evidence.summary.failed += 1;
      }
    } catch (err) {
      const attempts = (row.attempts ?? 0) + 1;
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('lms_email_outbox')
        .update({
          status: 'failed',
          attempts,
          last_error: msg,
          locked_at: null,
          locked_by: null,
        })
        .eq('id', row.id);
      entry.outcome = 'failed';
      entry.error = msg;
      evidence.summary.failed += 1;
    }

    evidence.results.push(entry);
    console.log(
      `${entry.outcome}: id=${entry.id} to=${entry.to_email_masked} attempts=${row.attempts}->${(row.attempts ?? 0) + 1}`,
    );
  }

  evidence.finished_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.log(
    `Done. sent=${evidence.summary.sent} failed=${evidence.summary.failed} wrote=${OUT}`,
  );
}

main().catch((err) => {
  evidence.errors.push(err instanceof Error ? err.message : String(err));
  evidence.finished_at = new Date().toISOString();
  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  } catch {
    /* ignore */
  }
  console.error(err);
  process.exit(1);
});
