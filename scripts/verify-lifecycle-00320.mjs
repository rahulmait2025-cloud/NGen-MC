/**
 * Stage verification for migration 00320 + CA data audit.
 * Writes evidence to scripts/verify-lifecycle-00320-evidence.json
 * Usage (from repo root, with lms deps): 
 *   node --import ./scripts/load-lms-env.mjs scripts/verify-lifecycle-00320.mjs [--apply]
 * Or set DATABASE_URL in the environment.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, '../lms/package.json'));
// Prefer pg resolved from lms/node_modules when launched from root
const { Client } = require('pg');

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

loadEnvFile(path.join(__dirname, '../lms/.env'));

function decodePassword(password) {
  try {
    return decodeURIComponent(password);
  } catch {
    return password;
  }
}

function buildPoolerCandidates(directUrl) {
  const candidates = [directUrl];
  try {
    const u = new URL(directUrl);
    const projectRef = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
    if (!projectRef) return candidates;
    const password = encodeURIComponent(decodePassword(u.password));
    for (const region of ['ap-south-1', 'ap-southeast-1', 'us-east-1']) {
      for (const port of [6543, 5432]) {
        candidates.push(
          `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:${port}/postgres`,
        );
      }
    }
  } catch {
    /* ignore */
  }
  return [...new Set(candidates)];
}

const APPLY = process.argv.includes('--apply');
const evidence = {
  startedAt: new Date().toISOString(),
  projectHint: null,
  connectionUsed: null,
  preflight: {},
  migration: { applied: false, command: null, result: null },
  eventTypeProbes: {},
  caDataAudit: {},
  errors: [],
};

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(invalid)';
  }
}

async function connectWithFallback(databaseUrl) {
  const candidates = buildPoolerCandidates(databaseUrl);
  let lastError;
  for (const connectionString of candidates) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      evidence.connectionUsed = maskUrl(connectionString);
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  const databaseUrl = process.env.OVERRIDE_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing');
  }
  evidence.projectHint = maskUrl(databaseUrl);

  const client = await connectWithFallback(databaseUrl);

  try {
    // --- Preflight ---
    const nullable = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'note_payment_orders'
        AND column_name = 'student_id'
    `);
    evidence.preflight.student_id_column = nullable.rows;

    const fk = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.note_payment_orders'::regclass
        AND contype = 'f'
        AND conname LIKE '%student%'
    `);
    evidence.preflight.student_id_fk = fk.rows;

    const invoiceFk = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'lms_invoices'
        AND column_name = 'note_payment_order_id'
    `);
    evidence.preflight.lms_invoices_note_payment_order_id = invoiceFk.rows;

    const invoiceFkDef = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.lms_invoices'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) ILIKE '%note_payment_order%'
    `);
    evidence.preflight.lms_invoices_note_payment_order_fk = invoiceFkDef.rows;

    const invalidStudents = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM public.note_payment_orders npo
      WHERE npo.student_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = npo.student_id)
    `);
    evidence.preflight.invalid_note_order_student_ids = invalidStudents.rows[0].count;

    const orphanInvoices = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM public.lms_invoices i
      WHERE i.note_payment_order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.note_payment_orders n WHERE n.id = i.note_payment_order_id
        )
    `);
    evidence.preflight.orphan_invoice_note_orders = orphanInvoices.rows[0].count;

    const dupIdem = await client.query(`
      SELECT idempotency_key, COUNT(*)::int AS c
      FROM public.lms_email_outbox
      WHERE idempotency_key IS NOT NULL
      GROUP BY idempotency_key
      HAVING COUNT(*) > 1
      LIMIT 20
    `);
    evidence.preflight.duplicate_idempotency_keys = dupIdem.rows;

    const eventTypes = await client.query(`
      SELECT DISTINCT event_type FROM public.lms_email_outbox ORDER BY 1
    `);
    evidence.preflight.existing_outbox_event_types = eventTypes.rows.map((r) => r.event_type);

    const checkConstraint = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conrelid = 'public.lms_email_outbox'::regclass
        AND conname = 'lms_email_outbox_event_type_check'
    `);
    evidence.preflight.event_type_check_before = checkConstraint.rows;

    const migHistory = await client.query(`
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      WHERE version LIKE '%00320%' OR name LIKE '%00320%'
      ORDER BY version
    `).catch(async (err) => {
      // fallback table name variants
      try {
        const alt = await client.query(`
          SELECT * FROM supabase_migrations.schema_migrations
          ORDER BY version DESC LIMIT 5
        `);
        return { rows: alt.rows, error: String(err) };
      } catch (e2) {
        return { rows: [], error: String(err) + ' / ' + String(e2) };
      }
    });
    evidence.preflight.migration_00320_history = migHistory.rows;
    evidence.preflight.migration_history_error = migHistory.error ?? null;

    const recentMigs = await client.query(`
      SELECT version, name
      FROM supabase_migrations.schema_migrations
      ORDER BY version DESC
      LIMIT 8
    `).catch(() => ({ rows: [] }));
    evidence.preflight.recent_migrations = recentMigs.rows;

    const blockingEventTypes = (evidence.preflight.existing_outbox_event_types || []).filter(
      (t) =>
        ![
          'google_welcome',
          'account_welcome',
          'campus_ambassador_approval',
          'payment_confirmation',
          'batch_enrollment_success',
          'mentorship_payment_confirmation',
          'mentorship_booking_confirmed',
          'mentorship_reminder',
          'mentorship_reschedule_confirmed',
          'mentorship_session_completed',
          'mentorship_admin_booking_notification',
          'mentorship_admin_reschedule_notification',
        ].includes(t),
    );
    evidence.preflight.outbox_rows_failing_new_constraint = blockingEventTypes;

    const safeToApply =
      evidence.preflight.invalid_note_order_student_ids === 0 &&
      evidence.preflight.orphan_invoice_note_orders === 0 &&
      blockingEventTypes.length === 0;

    evidence.preflight.safe_to_apply = safeToApply;

    if (APPLY) {
      if (!safeToApply) {
        evidence.migration.result = 'ABORTED: preflight failed';
        throw new Error('Preflight failed; refusing to apply');
      }

      const already =
        (evidence.preflight.migration_00320_history || []).length > 0 ||
        (evidence.preflight.student_id_column?.[0]?.is_nullable === 'YES' &&
          (evidence.preflight.student_id_fk?.[0]?.def || '').includes('ON DELETE SET NULL'));

      if (already && (evidence.preflight.migration_00320_history || []).length > 0) {
        evidence.migration.result = 'SKIPPED: already in schema_migrations';
        evidence.migration.applied = false;
      } else {
        const sqlPath = path.join(
          __dirname,
          '..',
          'super',
          'supabase',
          'migrations',
          '00320_student_delete_financial_retain_and_email_events.sql',
        );
        const sql = fs.readFileSync(sqlPath, 'utf8');
        evidence.migration.command =
          'node --env-file=lms/.env scripts/verify-lifecycle-00320.mjs --apply';
        evidence.migration.sqlFile = sqlPath;

        await client.query('BEGIN');
        try {
          // Strip outer BEGIN/COMMIT from file so we control the transaction + history insert
          const body = sql
            .replace(/^\s*BEGIN\s*;/i, '')
            .replace(/COMMIT\s*;\s*$/i, '');
          await client.query(body);

          // Record in supabase_migrations if not present
          const version = '00320';
          const name = 'student_delete_financial_retain_and_email_events';
          const exists = await client.query(
            `SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = $1 LIMIT 1`,
            [version],
          );
          if (exists.rowCount === 0) {
            // Try common column shapes
            try {
              await client.query(
                `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)`,
                [version, name],
              );
            } catch {
              await client.query(
                `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1)`,
                [version],
              );
            }
          }
          await client.query('COMMIT');
          evidence.migration.applied = true;
          evidence.migration.result = 'APPLIED OK';
        } catch (e) {
          await client.query('ROLLBACK');
          evidence.migration.result = 'FAILED: ' + String(e);
          throw e;
        }
      }

      // Post-apply checks
      const afterCol = await client.query(`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_schema='public' AND table_name='note_payment_orders' AND column_name='student_id'
      `);
      const afterFk = await client.query(`
        SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'public.note_payment_orders'::regclass
          AND contype = 'f' AND conname LIKE '%student%'
      `);
      const afterCheck = await client.query(`
        SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'public.lms_email_outbox'::regclass
          AND conname = 'lms_email_outbox_event_type_check'
      `);
      evidence.migration.after = {
        student_id_nullable: afterCol.rows[0]?.is_nullable,
        student_id_fk: afterFk.rows[0]?.def,
        event_type_check: afterCheck.rows[0]?.def,
      };

      // Probe insert new + old event types (rollback via delete)
      const probeTypes = [
        'account_welcome',
        'campus_ambassador_approval',
        'google_welcome',
        'payment_confirmation',
        'batch_enrollment_success',
        'mentorship_payment_confirmation',
        'mentorship_booking_confirmed',
        'mentorship_reminder',
        'mentorship_reschedule_confirmed',
        'mentorship_session_completed',
        'mentorship_admin_booking_notification',
        'mentorship_admin_reschedule_notification',
      ];

      for (const eventType of probeTypes) {
        const key = `verify_probe:${eventType}:${Date.now()}`;
        try {
          const ins = await client.query(
            `
            INSERT INTO public.lms_email_outbox (
              event_type, category, to_email, subject, html_body, text_body, idempotency_key, status
            ) VALUES (
              $1, 'transactional_essential', 'probe@example.invalid',
              'probe', '<p>probe</p>', 'probe', $2, 'pending'
            )
            RETURNING id
            `,
            [eventType, key],
          );
          const id = ins.rows[0].id;
          await client.query(`DELETE FROM public.lms_email_outbox WHERE id = $1`, [id]);
          evidence.eventTypeProbes[eventType] = 'ok';
        } catch (e) {
          evidence.eventTypeProbes[eventType] = 'FAIL: ' + String(e.message || e);
        }
      }
    }

    // --- CA data audit (read-only) ---
    const appsByStatus = await client.query(`
      SELECT status, COUNT(*)::int AS c
      FROM public.campus_ambassador_applications
      GROUP BY status
      ORDER BY status
    `).catch((e) => ({ rows: [], error: String(e) }));
    evidence.caDataAudit.applications_by_status = appsByStatus.rows;
    if (appsByStatus.error) evidence.caDataAudit.applications_by_status_error = appsByStatus.error;

    const activeAmbs = await client.query(`
      SELECT COUNT(*)::int AS c FROM public.campus_ambassadors
      WHERE status = 'active' AND access_enabled = true
    `).catch((e) => ({ rows: [{ c: null }], error: String(e) }));
    evidence.caDataAudit.active_ambassadors = activeAmbs.rows[0]?.c;
    if (activeAmbs.error) evidence.caDataAudit.active_ambassadors_error = activeAmbs.error;

    const approvedNoAmb = await client.query(`
      SELECT COUNT(*)::int AS c
      FROM public.campus_ambassador_applications a
      WHERE a.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM public.campus_ambassadors ca
          WHERE ca.user_id = a.user_id AND ca.status = 'active'
        )
    `).catch((e) => ({ rows: [{ c: null }], error: String(e) }));
    evidence.caDataAudit.approved_without_ambassador = approvedNoAmb.rows[0]?.c;

    const ambNoApproved = await client.query(`
      SELECT COUNT(*)::int AS c
      FROM public.campus_ambassadors ca
      WHERE ca.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM public.campus_ambassador_applications a
          WHERE a.user_id = ca.user_id AND a.status = 'approved'
        )
    `).catch((e) => ({ rows: [{ c: null }], error: String(e) }));
    evidence.caDataAudit.ambassador_without_approved_app = ambNoApproved.rows[0]?.c;

    const multiApps = await client.query(`
      SELECT user_id, COUNT(*)::int AS c
      FROM public.campus_ambassador_applications
      WHERE status IN ('submitted', 'approved')
      GROUP BY user_id
      HAVING COUNT(*) > 1
      LIMIT 50
    `).catch((e) => ({ rows: [], error: String(e) }));
    evidence.caDataAudit.users_multiple_active_applications = multiApps.rows;

    const multiAmb = await client.query(`
      SELECT user_id, COUNT(*)::int AS c
      FROM public.campus_ambassadors
      WHERE status = 'active'
      GROUP BY user_id
      HAVING COUNT(*) > 1
      LIMIT 50
    `).catch((e) => ({ rows: [], error: String(e) }));
    evidence.caDataAudit.users_multiple_active_ambassadors = multiAmb.rows;

    const dupCodes = await client.query(`
      SELECT referral_code, COUNT(*)::int AS c
      FROM public.campus_ambassadors
      WHERE referral_code IS NOT NULL
      GROUP BY referral_code
      HAVING COUNT(*) > 1
      LIMIT 50
    `).catch((e) => ({ rows: [], error: String(e) }));
    evidence.caDataAudit.duplicate_referral_codes = dupCodes.rows;

    const dupCoupons = await client.query(`
      SELECT coupon_id, COUNT(*)::int AS c
      FROM public.campus_ambassadors
      WHERE coupon_id IS NOT NULL AND status = 'active'
      GROUP BY coupon_id
      HAVING COUNT(*) > 1
      LIMIT 50
    `).catch((e) => ({ rows: [], error: String(e) }));
    evidence.caDataAudit.duplicate_active_coupons = dupCoupons.rows;

    const submittedWithAccess = await client.query(`
      SELECT COUNT(*)::int AS c
      FROM public.campus_ambassador_applications a
      JOIN public.campus_ambassadors ca ON ca.user_id = a.user_id
      WHERE a.status = 'submitted'
        AND ca.status = 'active'
        AND ca.access_enabled = true
    `).catch((e) => ({ rows: [{ c: null }], error: String(e) }));
    evidence.caDataAudit.submitted_with_active_access = submittedWithAccess.rows[0]?.c;

    evidence.finishedAt = new Date().toISOString();
  } finally {
    await client.end();
  }

  const outPath = path.join(__dirname, 'verify-lifecycle-00320-evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify({ safe: evidence.preflight.safe_to_apply, applied: evidence.migration.applied, result: evidence.migration.result }, null, 2));
}

main().catch((e) => {
  evidence.errors.push(String(e));
  evidence.finishedAt = new Date().toISOString();
  const outPath = path.join(__dirname, 'verify-lifecycle-00320-evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.error(e);
  process.exit(1);
});
