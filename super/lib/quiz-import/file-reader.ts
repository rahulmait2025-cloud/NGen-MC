export interface SpreadsheetContents {
  rawHeaders: string[];
  rawRows: Array<Record<string, string>>;
}

interface LoadedXLSX {
  read: (data: ArrayBuffer, opts: { type: 'array' }) => XLSXWorkbook;
  utils: {
    sheet_to_json: (
      sheet: unknown,
      opts: { header: number; defval: string; raw: false; blankrows: boolean },
    ) => Array<Array<string | number | null>>;
  };
}

interface XLSXWorkbook {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
}

let cached: Promise<LoadedXLSX> | null = null;

function getXLSX(): Promise<LoadedXLSX> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('xlsx must be loaded in the browser only'));
  }
  if (!cached) {
    cached = import('xlsx').then((mod) => {
      const lib = (mod as unknown as { default?: LoadedXLSX } & LoadedXLSX).default
        ?? (mod as unknown as LoadedXLSX);
      return lib;
    });
  }
  return cached;
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

function isCSV(name: string): boolean {
  return name.toLowerCase().endsWith('.csv');
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetContents> {
  if (file.size === 0) {
    throw new Error('File is empty.');
  }

  if (isCSV(file.name)) {
    const text = await file.text();
    return parseCSV(text);
  }

  const xlsx = await getXLSX();
  const buffer = await readFileAsArrayBuffer(file);
  const wb = xlsx.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { rawHeaders: [], rawRows: [] };
  }
  const sheet = wb.Sheets[sheetName];
  const matrix = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  });

  if (!matrix.length) {
    return { rawHeaders: [], rawRows: [] };
  }

  const headerRow = (matrix[0] as Array<string | number | null>).map((c) =>
    c == null ? '' : String(c).trim(),
  );
  const rawHeaders: string[] = headerRow;

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] as Array<string | number | null>;
    const obj: Record<string, string> = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const key = rawHeaders[j] || `_col_${j + 1}`;
      const value = row?.[j];
      obj[key] = value == null ? '' : String(value).trim();
    }
    rows.push(obj);
  }

  return { rawHeaders, rawRows: rows };
}

function parseCSV(text: string): SpreadsheetContents {
  const lines = splitCSVLines(text);
  if (lines.length === 0) return { rawHeaders: [], rawRows: [] };

  let headerLineIdx = 0;
  while (headerLineIdx < lines.length && lines[headerLineIdx].length === 0) {
    headerLineIdx++;
  }
  if (headerLineIdx >= lines.length) return { rawHeaders: [], rawRows: [] };

  const headerCells = parseCSVLine(lines[headerLineIdx]);
  const rawHeaders = headerCells.map((c) => c.trim());

  const rows: Array<Record<string, string>> = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    const cells = parseCSVLine(line);
    const obj: Record<string, string> = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const key = rawHeaders[j] || `_col_${j + 1}`;
      obj[key] = (cells[j] ?? '').trim();
    }
    rows.push(obj);
  }

  return { rawHeaders, rawRows: rows };
}

function splitCSVLines(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      buf += ch;
      if (text[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0 || out.length === 0) out.push(buf);
  return out;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          buf += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        buf += ch;
      }
      continue;
    }
    if (ch === ',') {
      out.push(buf);
      buf = '';
      continue;
    }
    if (ch === '"' && buf.length === 0) {
      inQuotes = true;
      continue;
    }
    buf += ch;
  }
  out.push(buf);
  return out;
}
