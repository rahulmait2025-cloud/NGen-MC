import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function decodeEmail(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

async function recordUnsubscribe(email: string): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.warn('[unsubscribe] Missing Google Sheets config, skipping record.');
    return;
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = 'Unsubscribes';

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const existing = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  if (!existing.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A:B`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['email', 'unsubscribed_at']] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:B`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[email, new Date().toISOString()]] },
  });

  console.log(`[unsubscribe] Recorded unsubscribe for ${email}`);
}

function renderPage(title: string, message: string, isSuccess: boolean) {
  const accent = isSuccess ? '#16a34a' : '#dc2626';
  const icon = isSuccess
    ? '<div style="width:56px;height:56px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>'
    : '<div style="width:56px;height:56px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></div>';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — NextGen CTO</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',Arial,Helvetica,sans-serif;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;max-width:480px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 10px 25px rgba(15,23,42,0.08)}
  h1{font-size:20px;font-weight:700;color:#111827;margin-bottom:10px}
  p{font-size:15px;color:#4b5563;line-height:1.6;margin-bottom:16px}
  .accent{color:${accent};font-weight:600}
  a{color:#2563eb;text-decoration:none}
  a:hover{text-decoration:underline}
  .footer{margin-top:24px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:13px;color:#9ca3af}
</style>
</head><body><div class="card">
  ${icon}
  <h1>${title}</h1>
  <p>${message}</p>
  <div class="footer">NextGen CTO &middot; <a href="https://www.nextgen-cto.in">www.nextgen-cto.in</a></div>
</div></body></html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(
      renderPage(
        'Invalid Link',
        'This unsubscribe link is invalid or has expired. If you believe this is an error, please contact us at <a href="mailto:hello@nextgen-cto.in">hello@nextgen-cto.in</a>.',
        false
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const email = decodeEmail(token);

  if (!email || !email.includes('@')) {
    return new NextResponse(
      renderPage(
        'Invalid Link',
        'We could not verify your email address from this link. Please contact us at <a href="mailto:hello@nextgen-cto.in">hello@nextgen-cto.in</a>.',
        false
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    await recordUnsubscribe(email);
  } catch (err) {
    console.error('[unsubscribe] Failed to record:', err instanceof Error ? err.message : err);
  }

  return new NextResponse(
    renderPage(
      'Unsubscribed Successfully',
      `<span class="accent">${email}</span> has been removed from our mailing list. You will no longer receive emails from NextGen CTO.<br/><br/>If this was a mistake, feel free to contact us at <a href="mailto:hello@nextgen-cto.in">hello@nextgen-cto.in</a>.`,
      true
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
