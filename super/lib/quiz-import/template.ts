export const TEMPLATE_HEADERS: readonly string[] = [
  'Question',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'Correct Answer',
  'Explanation',
  'Points',
  'Question Type',
];

export function buildTemplateRow(): string[] {
  return [
    'What is the capital of France?',
    'London',
    'Paris',
    'Berlin',
    'Madrid',
    'B',
    'Paris is the capital and most populous city of France.',
    '1',
    'single_choice',
  ];
}

export interface TemplateWorkbook {
  filename: string;
  mime: string;
  write: () => Promise<ArrayBuffer>;
}

interface XLSXLib {
  utils: {
    book_new: () => unknown;
    aoa_to_sheet: (data: Array<Array<string | number>>) => unknown;
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
  };
  write: (wb: unknown, opts: { type: 'array'; bookType: 'xlsx' }) => ArrayBuffer;
}

let cached: Promise<XLSXLib> | null = null;

function getXLSX(): Promise<XLSXLib> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('xlsx must be loaded in the browser only'));
  }
  if (!cached) {
    cached = import('xlsx').then((mod) => {
      return (mod as unknown as { default?: XLSXLib } & XLSXLib).default
        ?? (mod as unknown as XLSXLib);
    });
  }
  return cached;
}

export async function buildTemplateWorkbook(): Promise<TemplateWorkbook> {
  const xlsx = await getXLSX();
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    buildTemplateRow(),
  ]);
  xlsx.utils.book_append_sheet(wb, ws, 'Questions');

  return {
    filename: 'quiz-import-template.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    write: async () =>
      xlsx.write(wb, { type: 'array', bookType: 'xlsx' }),
  };
}

export function buildTemplateCSV(): TemplateWorkbook {
  const escape = (s: string): string => {
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    `${TEMPLATE_HEADERS.map(escape).join(',')}`,
    `${buildTemplateRow().map(escape).join(',')}`,
  ];
  const blob = lines.join('\r\n');
  const buffer = new ArrayBuffer(blob.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < blob.length; i++) view[i] = blob.charCodeAt(i);
  return {
    filename: 'quiz-import-template.csv',
    mime: 'text/csv;charset=utf-8',
    write: async () => buffer,
  };
}

export async function downloadTemplate(): Promise<void> {
  const isCSV = false;
  const wb = isCSV ? buildTemplateCSV() : await buildTemplateWorkbook();
  const buffer = await wb.write();
  const blob = new Blob([buffer], { type: wb.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = wb.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
