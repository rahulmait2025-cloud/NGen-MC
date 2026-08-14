import { google } from 'googleapis';

// Use same type signature as the expected form payload or DB slice
export interface CollegeLeadSheetData {
  full_name: string;
  work_email: string;
  phone_number: string;
  college_name: string;
  designation?: string;
  city?: string;
  state?: string;
  college_type?: string;
  student_count?: string;
  website_url?: string;
  interest_type?: string;
  message?: string;
  consent_given?: boolean;
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Appends a college lead to the configured Google Sheet as a best-effort side effect.
 */
export async function appendLeadToSheet(lead: CollegeLeadSheetData): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
  const clientEmail = (process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').replace(/^["']|["']$/g, '').trim();
  const rawPrivateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/^["']|["']$/g, '').trim();
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  if (!spreadsheetId || !sheetName || !clientEmail || !privateKey) {
    console.warn('[google-sheets] Missing Sheets configuration. Keys present:', {
      hasId: !!spreadsheetId,
      hasName: !!sheetName,
      hasEmail: !!clientEmail,
      hasKey: !!privateKey
    });
    return;
  }

  try {
    // Logging the email helps verify if the production environment is loading the correct variable
    console.log(`[google-sheets] Attempting auth with email: "${clientEmail}"`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const configuredSheetName = sheetName.trim();

    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });

    const availableSheetNames = (spreadsheetMeta.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title));

    if (availableSheetNames.length === 0) {
      throw new Error('No sheets found in the configured spreadsheet.');
    }

    const targetSheetName = availableSheetNames.includes(configuredSheetName)
      ? configuredSheetName
      : availableSheetNames[0];

    if (targetSheetName !== configuredSheetName) {
      console.warn(
        `[google-sheets] Sheet "${configuredSheetName}" not found. Falling back to "${targetSheetName}".`
      );
    }

    const escapedSheetName = targetSheetName.replace(/'/g, "''");
    const appendRange = `'${escapedSheetName}'!A:T`;

    // Order determined by Phase 5 spec:
    // created_at, full_name, work_email, phone_number, college_name, designation, city, state, college_type,
    // student_count, website_url, interest_type, message, consent_given, source_page, utm_source, utm_medium, utm_campaign, utm_term, utm_content
    const row = [
      new Date().toISOString(),
      lead.full_name || '',
      lead.work_email || '',
      lead.phone_number || '',
      lead.college_name || '',
      lead.designation || '',
      lead.city || '',
      lead.state || '',
      lead.college_type || '',
      lead.student_count || '',
      lead.website_url || '',
      lead.interest_type || '',
      lead.message || '',
      lead.consent_given ? 'Yes' : 'No',
      lead.source_page || '',
      lead.utm_source || '',
      lead.utm_medium || '',
      lead.utm_campaign || '',
      lead.utm_term || '',
      lead.utm_content || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: appendRange, // Up to 20 columns
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    console.log(`[google-sheets] Appended lead ${lead.work_email} to Google Sheets successfully.`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[google-sheets] Failed to append lead to Google Sheets:', errorMsg);
    
    if (errorMsg.includes('invalid_grant')) {
      console.error('[google-sheets] AUTH TIP: This error usually means your Private Key is invalid or does not match the Client Email in .env.');
    } else if (errorMsg.includes('404')) {
      console.error('[google-sheets] CONFIG TIP: Sheet ID not found. Check GOOGLE_SHEETS_SPREADSHEET_ID.');
    } else if (errorMsg.includes('403')) {
      console.error('[google-sheets] PERMISSION TIP: Have you shared the sheet with the Service Account email as an Editor?');
    }
    // Deliberately no throw - this is a best-effort side effect
  }
}

/**
 * Fetches the count of leads currently in the Google Sheet.
 * Subtracts 1 for the header row.
 */
export async function getCollegeLeadsCount(): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
  const clientEmail = (process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '').replace(/^["']|["']$/g, '').trim();
  const rawPrivateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/^["']|["']$/g, '').trim();
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  if (!spreadsheetId || !sheetName || !clientEmail || !privateKey) {
    console.warn('[google-sheets] Missing Sheets configuration for count.');
    return 0;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return 0;
    
    return rows.length - 1;
  } catch (error) {
    console.error('[google-sheets] Failed to fetch leads count:', error instanceof Error ? error.message : error);
    return 0;
  }
}
