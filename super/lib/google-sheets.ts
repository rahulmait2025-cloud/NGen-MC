const cleanEnvVar = (val: string | undefined) => {
  if (!val) return val;
  return val.replace(/^["']|["']$/g, '');
};

const SPREADSHEET_ID = cleanEnvVar(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
const RANGE = cleanEnvVar(process.env.GOOGLE_SHEETS_SHEET_NAME) || 'College_Leads';
const CLIENT_EMAIL = cleanEnvVar(process.env.GOOGLE_SHEETS_CLIENT_EMAIL);
const PRIVATE_KEY = cleanEnvVar(process.env.GOOGLE_SHEETS_PRIVATE_KEY)?.replace(/\\n/g, '\n');

async function getGoogleSheetsClient() {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    console.error('[GoogleSheets] Missing credentials:', { 
      hasEmail: !!CLIENT_EMAIL, 
      hasKey: !!PRIVATE_KEY 
    });
    throw new Error('Missing Google Sheets credentials in environment variables.');
  }

  try {
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('[GoogleSheets] Auth initialization failed:', error);
    throw error;
  }
}

export async function fetchSheetData() {
  if (!SPREADSHEET_ID) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID in environment variables.');
  }

  const sheets = await getGoogleSheetsClient();

  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${RANGE}'!A:Z`,
    });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 400 && err.message?.includes('Unable to parse range')) {
      console.warn(`[GoogleSheets] Sheet "${RANGE}" not found. Falling back to the first available sheet.`);
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const firstSheet = meta.data.sheets?.[0]?.properties?.title;
      if (firstSheet) {
        response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${firstSheet}'!A:Z`,
        });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const data = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      obj[header.trim()] = row[index] || '';
    });
    return obj;
  });

  return data;
}
