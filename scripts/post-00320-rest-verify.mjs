/**
 * Post-apply REST verification for migration 00320.
 * Loads lms/.env; uses service role. Writes scripts/post-00320-verify.json (no secrets).
 *
 * Usage from repo root:
 *   node scripts/post-00320-rest-verify.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'post-00320-verify.json');
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

loadEnvFile(path.join(ROOT, 'lms', '.env'));

const evidence = {
  startedAt: new Date().toISOString(),
  method: 'rest_service_role',
  supabaseUrlHost: null,
  eventTypeProbes: {},
  fakeEventTypeProbe: null,
  campusAmbassador: {
    applicationsByStatus: {},
    ambassadorsCount: null,
    error: null,
  },
  pgVerify: {
    attempted: false,
    connected: false,
    note: null,
  },
  errors: [],
  finishedAt: null,
};

function maskHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function probeEventType(supabase, eventType) {
  const idem = `verify-00320-${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    event_type: eventType,
    to_email: `verify-00320+${eventType.replace(/_/g, '-')}@example.invalid`,
    subject: 'verify-00320 probe',
    html_body: '<p>probe</p>',
    text_body: 'probe',
    category: 'transactional_essential',
    status: 'queued',
    idempotency_key: idem,
    metadata: { _verify: true, migration: '00320', eventType },
  };

  const insert = await supabase
    .from('lms_email_outbox')
    .insert(payload)
    .select('id, event_type, status')
    .single();

  if (insert.error) {
    return {
      eventType,
      insertOk: false,
      insertError: {
        code: insert.error.code ?? null,
        message: insert.error.message,
        details: insert.error.details ?? null,
        hint: insert.error.hint ?? null,
      },
      deleteOk: null,
    };
  }

  const id = insert.data.id;
  const del = await supabase.from('lms_email_outbox').delete().eq('id', id);
  return {
    eventType,
    insertOk: true,
    insertedId: id,
    insertError: null,
    deleteOk: !del.error,
    deleteError: del.error
      ? { code: del.error.code ?? null, message: del.error.message }
      : null,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from lms/.env');
  }
  evidence.supabaseUrlHost = maskHost(url);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const allowed = [
    'account_welcome',
    'campus_ambassador_approval',
    'google_welcome',
    'payment_confirmation',
  ];

  for (const eventType of allowed) {
    try {
      evidence.eventTypeProbes[eventType] = await probeEventType(supabase, eventType);
    } catch (err) {
      evidence.eventTypeProbes[eventType] = {
        eventType,
        insertOk: false,
        insertError: { message: String(err) },
        deleteOk: null,
      };
      evidence.errors.push(`probe ${eventType}: ${String(err)}`);
    }
  }

  try {
    const fake = await probeEventType(supabase, 'should_fail_xyz');
    evidence.fakeEventTypeProbe = {
      ...fake,
      expectedFail: true,
      failedAsExpected: fake.insertOk === false,
    };
  } catch (err) {
    evidence.fakeEventTypeProbe = {
      eventType: 'should_fail_xyz',
      insertOk: false,
      expectedFail: true,
      failedAsExpected: true,
      insertError: { message: String(err) },
    };
  }

  try {
    const { data: apps, error: appsErr } = await supabase
      .from('campus_ambassador_applications')
      .select('status');
    if (appsErr) {
      evidence.campusAmbassador.error = {
        stage: 'applications',
        code: appsErr.code ?? null,
        message: appsErr.message,
      };
    } else {
      const counts = {};
      for (const row of apps ?? []) {
        const s = row.status ?? '(null)';
        counts[s] = (counts[s] ?? 0) + 1;
      }
      evidence.campusAmbassador.applicationsByStatus = counts;
      evidence.campusAmbassador.applicationsTotal = (apps ?? []).length;
    }
  } catch (err) {
    evidence.campusAmbassador.error = { stage: 'applications', message: String(err) };
  }

  try {
    const { count, error: ambErr } = await supabase
      .from('campus_ambassadors')
      .select('*', { count: 'exact', head: true });
    if (ambErr) {
      evidence.campusAmbassador.ambassadorsError = {
        code: ambErr.code ?? null,
        message: ambErr.message,
      };
    } else {
      evidence.campusAmbassador.ambassadorsCount = count;
    }
  } catch (err) {
    evidence.campusAmbassador.ambassadorsError = { message: String(err) };
  }

  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
  console.log(`\nWrote ${OUT}`);
}

main().catch((err) => {
  evidence.errors.push(String(err));
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2), 'utf8');
  console.error(err);
  process.exit(1);
});
