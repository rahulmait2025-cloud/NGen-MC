/**
 * Prove note_payment_orders.student_id nullability via REST (service role).
 * Loads lms/.env. Writes scripts/student-id-nullability-probe.json (no secrets).
 *
 * Usage: node scripts/student-id-nullability-probe.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'student-id-nullability-probe.json');
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

function maskHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function errShape(e) {
  if (!e) return null;
  return {
    code: e.code ?? null,
    message: e.message ?? String(e),
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

const evidence = {
  startedAt: new Date().toISOString(),
  method: 'rest_service_role',
  supabaseUrlHost: null,
  table: 'note_payment_orders',
  column: 'student_id',
  getExisting: null,
  patchNull: null,
  patchRestore: null,
  insertNull: null,
  openApi: null,
  conclusion: {
    studentIdNullable: null,
    setNullWriteWorks: null,
    rationale: null,
  },
  errors: [],
  finishedAt: null,
};

async function fetchOpenApi(baseUrl, serviceKey) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/openapi+json, application/json',
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const result = {
    httpStatus: res.status,
    ok: res.ok,
    contentType: res.headers.get('content-type'),
    definitionFound: false,
    studentIdProperty: null,
    inRequiredArray: null,
    xNullable: null,
    nullable: null,
    type: null,
    parseNote: null,
  };

  if (!body || typeof body !== 'object') {
    result.parseNote = 'OpenAPI body not JSON object';
    return result;
  }

  const defs = body.definitions || body.components?.schemas || {};
  const keys = Object.keys(defs);
  const matchKey =
    keys.find((k) => k === 'note_payment_orders') ||
    keys.find((k) => /^note_payment_orders$/i.test(k)) ||
    keys.find((k) => k.toLowerCase().includes('note_payment_orders'));

  if (!matchKey) {
    result.parseNote = `No note_payment_orders definition among ${keys.length} defs; sample keys: ${keys.slice(0, 15).join(', ')}`;
    return result;
  }

  const def = defs[matchKey];
  result.definitionFound = true;
  result.parseNote = `Matched definition key: ${matchKey}`;
  const props = def.properties || {};
  const studentProp = props.student_id ?? null;
  result.studentIdProperty = studentProp
    ? {
        type: studentProp.type ?? null,
        format: studentProp.format ?? null,
        'x-nullable': studentProp['x-nullable'] ?? null,
        nullable: studentProp.nullable ?? null,
        description: studentProp.description ?? null,
      }
    : null;
  result.inRequiredArray = Array.isArray(def.required)
    ? def.required.includes('student_id')
    : null;
  result.xNullable = studentProp?.['x-nullable'] ?? null;
  result.nullable = studentProp?.nullable ?? null;
  result.type = studentProp?.type ?? null;
  return result;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    evidence.errors.push('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    evidence.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    console.error('Missing env');
    process.exit(1);
  }
  evidence.supabaseUrlHost = maskHost(url);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    evidence.openApi = await fetchOpenApi(url, serviceKey);
  } catch (e) {
    evidence.openApi = { error: errShape(e) };
    evidence.errors.push(`openapi: ${e.message || e}`);
  }

  const { data: rows, error: getErr } = await supabase
    .from('note_payment_orders')
    .select('id, student_id')
    .limit(1);

  evidence.getExisting = {
    error: errShape(getErr),
    rowCount: rows?.length ?? 0,
    row: rows?.[0] ?? null,
  };

  if (getErr) {
    evidence.errors.push(`get: ${getErr.message}`);
    evidence.conclusion.rationale = 'GET failed; cannot prove nullability via writes';
    evidence.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence.conclusion, null, 2));
    process.exit(1);
  }

  const row = rows?.[0];

  if (row && row.student_id != null) {
    const originalStudentId = row.student_id;
    const id = row.id;

    const { data: nullPatched, error: nullErr } = await supabase
      .from('note_payment_orders')
      .update({ student_id: null })
      .eq('id', id)
      .select('id, student_id')
      .maybeSingle();

    evidence.patchNull = {
      id,
      error: errShape(nullErr),
      success: !nullErr,
      after: nullPatched ?? null,
    };

    if (!nullErr) {
      const { data: restored, error: restoreErr } = await supabase
        .from('note_payment_orders')
        .update({ student_id: originalStudentId })
        .eq('id', id)
        .select('id, student_id')
        .maybeSingle();

      evidence.patchRestore = {
        id,
        originalStudentId,
        error: errShape(restoreErr),
        success: !restoreErr,
        after: restored ?? null,
      };

      evidence.conclusion.studentIdNullable = true;
      evidence.conclusion.setNullWriteWorks = true;
      evidence.conclusion.rationale =
        'PATCH set student_id=null succeeded then restored original; column is nullable and SET NULL write path works';
    } else {
      const msg = (nullErr.message || '').toLowerCase();
      const notNull =
        nullErr.code === '23502' ||
        msg.includes('null value') ||
        msg.includes('not-null');
      evidence.conclusion.studentIdNullable = notNull ? false : null;
      evidence.conclusion.setNullWriteWorks = false;
      evidence.conclusion.rationale = notNull
        ? `PATCH null failed with NOT NULL-style error (${nullErr.code}): ${nullErr.message}`
        : `PATCH null failed: ${nullErr.code} ${nullErr.message}`;
      evidence.errors.push(`patchNull: ${nullErr.message}`);
    }
  } else if (row && row.student_id == null) {
    evidence.conclusion.studentIdNullable = true;
    evidence.conclusion.setNullWriteWorks = null;
    evidence.conclusion.rationale =
      'Existing row already has student_id null (read path); did not PATCH further';
  } else {
    const insertPayload = {
      student_id: null,
      amount: 0,
      status: 'pending',
    };

    const { data: inserted, error: insErr } = await supabase
      .from('note_payment_orders')
      .insert(insertPayload)
      .select('id, student_id')
      .maybeSingle();

    evidence.insertNull = {
      payloadKeys: Object.keys(insertPayload),
      error: errShape(insErr),
      success: !insErr,
      inserted: inserted ?? null,
      deleted: null,
    };

    if (!insErr && inserted?.id) {
      const { error: delErr } = await supabase
        .from('note_payment_orders')
        .delete()
        .eq('id', inserted.id);
      evidence.insertNull.deleted = {
        success: !delErr,
        error: errShape(delErr),
      };
      evidence.conclusion.studentIdNullable = true;
      evidence.conclusion.setNullWriteWorks = true;
      evidence.conclusion.rationale =
        'No existing rows; INSERT with student_id null succeeded (then deleted); column is nullable';
    } else if (insErr) {
      const msg = (insErr.message || '').toLowerCase();
      const notNull =
        insErr.code === '23502' ||
        msg.includes('null value in column "student_id"') ||
        (msg.includes('student_id') && msg.includes('not-null'));
      if (notNull) {
        evidence.conclusion.studentIdNullable = false;
        evidence.conclusion.setNullWriteWorks = false;
        evidence.conclusion.rationale = `INSERT null failed NOT NULL on student_id: ${insErr.message}`;
      } else {
        evidence.conclusion.studentIdNullable = null;
        evidence.conclusion.setNullWriteWorks = null;
        evidence.conclusion.rationale = `No rows to PATCH; INSERT with student_id null failed on other constraints (not proving NOT NULL on student_id): ${insErr.code} ${insErr.message}`;
      }
      evidence.errors.push(`insertNull: ${insErr.message}`);
    }
  }

  if (
    evidence.conclusion.studentIdNullable == null &&
    evidence.openApi?.definitionFound
  ) {
    const oa = evidence.openApi;
    if (oa.xNullable === true || oa.nullable === true) {
      evidence.conclusion.studentIdNullable = true;
      evidence.conclusion.rationale =
        (evidence.conclusion.rationale || '') +
        ' OpenAPI marks student_id as nullable (x-nullable/nullable).';
    } else if (oa.inRequiredArray === true && oa.xNullable !== true) {
      evidence.conclusion.rationale =
        (evidence.conclusion.rationale || '') +
        ' OpenAPI lists student_id in required and not x-nullable (suggests non-null; write path inconclusive).';
    } else if (oa.xNullable === false) {
      evidence.conclusion.studentIdNullable = false;
      evidence.conclusion.rationale =
        (evidence.conclusion.rationale || '') +
        ' OpenAPI x-nullable=false.';
    }
  }

  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.log('Wrote', OUT);
  console.log(JSON.stringify(evidence.conclusion, null, 2));
  console.log(
    'studentIdNullable=',
    evidence.conclusion.studentIdNullable,
    'setNullWriteWorks=',
    evidence.conclusion.setNullWriteWorks
  );
}

main().catch((e) => {
  evidence.errors.push(String(e?.stack || e));
  evidence.finishedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.error(e);
  process.exit(1);
});
