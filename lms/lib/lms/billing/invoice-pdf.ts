/**
 * Styled server-side invoice PDF matching the HTML invoice page.
 * Uses PDF graphics operators (no Chromium / heavy deps).
 * Logo: embeds public/assets/logo-icon.png when available.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export type InvoicePdfModel = {
  invoiceNumber: string;
  issuedAtLabel: string;
  orderId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  supportEmail?: string | null;
  entitySectionLabel?: string | null;
  supplier: {
    legalName: string;
    gstin: string | null;
    address: string;
    sacCode: string | null;
  };
  customer: {
    name: string;
    email: string;
    placeOfSupply: string | null;
  };
  lineItems: Array<{ title: string; qty: number; amountMinor: number }>;
  subtotalMinor: number;
  discountMinor: number;
  taxableValueMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  totalMinor: number;
  currency: string;
  isGstInvoice: boolean;
  metadataWarnings: string[];
};

const PAGE_W = 612;
const PAGE_H = 792;
/** Outer page margin to the invoice frame. */
const PAGE_MARGIN = 40;
/** Gap between the outer frame stroke and drawable content. */
const INNER_PADDING = 16;
/** Horizontal gap between billed-to and invoice-details columns. */
const COL_GAP = 24;

const FRAME_LEFT = PAGE_MARGIN;
const FRAME_RIGHT = PAGE_W - PAGE_MARGIN;
const FRAME_WIDTH = FRAME_RIGHT - FRAME_LEFT;
const CONTENT_LEFT = FRAME_LEFT + INNER_PADDING;
const CONTENT_RIGHT = FRAME_RIGHT - INNER_PADDING;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2;
const DETAILS_LEFT = CONTENT_LEFT + COL_WIDTH + COL_GAP;
const DETAILS_RIGHT = CONTENT_RIGHT;

const COLORS = {
  headerBg: [0.043, 0.059, 0.098] as const,
  accent: [0.961, 0.62, 0.043] as const,
  paidBg: [0.925, 0.992, 0.961] as const,
  paidText: [0.016, 0.471, 0.341] as const,
  muted: [0.392, 0.455, 0.545] as const,
  body: [0.059, 0.09, 0.165] as const,
  secondary: [0.278, 0.337, 0.416] as const,
  cardBg: [0.973, 0.98, 0.988] as const,
  cardBorder: [0.886, 0.91, 0.941] as const,
  tableHead: [0.945, 0.961, 0.976] as const,
  white: [1, 1, 1] as const,
  line: [0.898, 0.906, 0.922] as const,
};

type DecPng = { width: number; height: number; rgb: Buffer };

function formatMoney(minor: number, currency: string): string {
  const amount = (minor / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'INR') return `Rs. ${amount}`;
  return `${currency} ${amount}`;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function toPdfSafeText(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, '?');
}

/**
 * Approximate Helvetica glyph width in PDF user units.
 * Slightly conservative (wider) so right-aligned text never clips the frame.
 */
function estimateTextWidth(
  text: string,
  size: number,
  font: 'F1' | 'F2' = 'F1',
): number {
  const safe = toPdfSafeText(text);
  let units = 0;
  for (const ch of safe) {
    const code = ch.charCodeAt(0);
    if (ch === ' ') units += 278;
    else if (ch === '.' || ch === ',' || ch === ':' || ch === ';') units += 278;
    else if (ch === '-' || ch === '_') units += 333;
    else if (code >= 48 && code <= 57) units += 556; // digits
    else if (code >= 65 && code <= 90) units += 667; // uppercase
    else if (code >= 97 && code <= 122) units += 556; // lowercase
    else units += 600;
  }
  const boldFactor = font === 'F2' ? 1.06 : 1;
  return (units / 1000) * size * boldFactor;
}

function fitTextToWidth(
  text: string,
  maxWidth: number,
  size: number,
  font: 'F1' | 'F2' = 'F1',
): string {
  const safe = toPdfSafeText(text);
  if (estimateTextWidth(safe, size, font) <= maxWidth) return safe;
  const ellipsis = '...';
  const ellipsisW = estimateTextWidth(ellipsis, size, font);
  if (ellipsisW >= maxWidth) return '';
  let lo = 0;
  let hi = safe.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = safe.slice(0, mid);
    if (estimateTextWidth(candidate, size, font) + ellipsisW <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${safe.slice(0, lo)}${ellipsis}` : ellipsis;
}

/** Wrap text into lines that each fit within maxWidth. Prefers breaks at `_` / `-` / space. */
function wrapTextToWidth(
  text: string,
  maxWidth: number,
  size: number,
  font: 'F1' | 'F2' = 'F1',
  maxLines = 3,
): string[] {
  const safe = toPdfSafeText(text).trim();
  if (!safe) return [''];
  if (estimateTextWidth(safe, size, font) <= maxWidth) return [safe];

  const tokens = safe.split(/([_\-\s])/).filter((t) => t.length > 0);
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (line) lines.push(line);
  };

  for (const token of tokens) {
    const next = current + token;
    if (estimateTextWidth(next, size, font) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      pushLine(current);
      current = '';
      if (lines.length >= maxLines) break;
    }
    if (estimateTextWidth(token, size, font) <= maxWidth) {
      current = token.trimStart();
      continue;
    }
    // Hard-split an oversized token across remaining lines.
    let rest = token;
    while (rest && lines.length < maxLines) {
      let cut = rest.length;
      while (cut > 1 && estimateTextWidth(rest.slice(0, cut), size, font) > maxWidth) {
        cut -= 1;
      }
      const isLastAllowed = lines.length === maxLines - 1;
      if (isLastAllowed && rest.length > cut) {
        lines.push(fitTextToWidth(rest, maxWidth, size, font));
        rest = '';
        break;
      }
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = '';
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) pushLine(current);
  if (!lines.length) lines.push(fitTextToWidth(safe, maxWidth, size, font));
  return lines;
}

function rgbOp(c: readonly [number, number, number]): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} rg`;
}

function RG(c: readonly [number, number, number]): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} RG`;
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: readonly [number, number, number],
  stroke?: readonly [number, number, number],
  lineWidth = 1,
): string {
  const parts: string[] = [];
  if (fill) parts.push(rgbOp(fill));
  if (stroke) {
    parts.push(RG(stroke));
    parts.push(`${lineWidth} w`);
  }
  parts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
  if (fill && stroke) parts.push('B');
  else if (fill) parts.push('f');
  else parts.push('S');
  return parts.join('\n');
}

function textAt(
  x: number,
  y: number,
  text: string,
  opts: { size?: number; font?: 'F1' | 'F2'; color?: readonly [number, number, number] } = {},
): string {
  const size = opts.size ?? 11;
  const font = opts.font ?? 'F1';
  const color = opts.color ?? COLORS.body;
  const safe = pdfEscape(toPdfSafeText(text));
  return [
    'BT',
    rgbOp(color),
    `/${font} ${size} Tf`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${safe}) Tj`,
    'ET',
  ].join('\n');
}

/**
 * Draw text right-aligned so its right edge sits at `rightX` (PDF `x` is the start glyph).
 * Never draws past `rightX`; truncates when needed.
 */
function textRight(
  rightX: number,
  y: number,
  text: string,
  opts: {
    size?: number;
    font?: 'F1' | 'F2';
    color?: readonly [number, number, number];
    maxWidth?: number;
  } = {},
): string {
  const size = opts.size ?? 11;
  const font = opts.font ?? 'F1';
  const maxWidth = opts.maxWidth ?? Math.max(24, rightX - CONTENT_LEFT);
  const fitted = fitTextToWidth(text, maxWidth, size, font);
  const width = estimateTextWidth(fitted, size, font);
  const startX = Math.max(CONTENT_LEFT, rightX - width);
  return textAt(startX, y, fitted, { size, font, color: opts.color });
}

/** Minimal PNG decoder for RGB/RGBA (non-interlaced) logos. */
function decodePngRgb(filePath: string): DecPng | null {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;

    let width = 0;
    let height = 0;
    let bitDepth = 8;
    let colorType = 6;
    const idat: Buffer[] = [];
    let offset = 8;

    while (offset + 8 <= buf.length) {
      const len = buf.readUInt32BE(offset);
      const type = buf.toString('ascii', offset + 4, offset + 8);
      const data = buf.subarray(offset + 8, offset + 8 + len);
      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8] ?? 8;
        colorType = data[9] ?? 6;
      } else if (type === 'IDAT') {
        idat.push(Buffer.from(data));
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + len;
    }

    if (!width || !height || bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
      return null;
    }

    const inflated = zlib.inflateSync(Buffer.concat(idat));
    const bytesPerPixel = colorType === 6 ? 4 : 3;
    const stride = width * bytesPerPixel;
    const rgb = Buffer.alloc(width * height * 3);
    let inPos = 0;
    let prev = Buffer.alloc(stride);

    for (let row = 0; row < height; row++) {
      const filter = inflated[inPos++] ?? 0;
      const cur = Buffer.alloc(stride);
      for (let i = 0; i < stride; i++) {
        const raw = inflated[inPos++] ?? 0;
        const a = i >= bytesPerPixel ? cur[i - bytesPerPixel]! : 0;
        const b = prev[i]!;
        const c = i >= bytesPerPixel ? prev[i - bytesPerPixel]! : 0;
        let val = raw;
        if (filter === 1) val = (raw + a) & 0xff;
        else if (filter === 2) val = (raw + b) & 0xff;
        else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = (raw + pr) & 0xff;
        }
        cur[i] = val;
      }
      for (let x = 0; x < width; x++) {
        const src = x * bytesPerPixel;
        const dst = (row * width + x) * 3;
        const alpha = bytesPerPixel === 4 ? (cur[src + 3] ?? 255) / 255 : 1;
        // Composite onto dark header background so transparent logo pixels look correct.
        const br = 11;
        const bg = 15;
        const bb = 25;
        rgb[dst] = Math.round((cur[src] ?? 0) * alpha + br * (1 - alpha));
        rgb[dst + 1] = Math.round((cur[src + 1] ?? 0) * alpha + bg * (1 - alpha));
        rgb[dst + 2] = Math.round((cur[src + 2] ?? 0) * alpha + bb * (1 - alpha));
      }
      prev = cur;
    }

    return { width, height, rgb };
  } catch {
    return null;
  }
}

let cachedLogo: DecPng | null | undefined;

function loadLogo(): DecPng | null {
  if (cachedLogo !== undefined) return cachedLogo;
  const candidates = [
    path.join(process.cwd(), 'public', 'assets', 'logo-icon.png'),
    path.join(process.cwd(), 'lms', 'public', 'assets', 'logo-icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const decoded = decodePngRgb(p);
      if (decoded) {
        cachedLogo = decoded;
        return cachedLogo;
      }
    }
  }
  cachedLogo = null;
  return null;
}

function buildPageContent(model: InvoicePdfModel, logoName: string | null): string {
  const ops: string[] = [];
  const receiptLabel = model.isGstInvoice ? 'TAX INVOICE' : 'PAYMENT RECEIPT';
  const entityLabel = (model.entitySectionLabel ?? 'Purchased item').toUpperCase();
  const primaryTitle = model.lineItems[0]?.title ?? 'Purchase';
  const orderRef =
    model.orderId && model.orderId.length >= 8
      ? model.orderId.slice(0, 8).toUpperCase()
      : model.orderId ?? '';
  const support = model.supportEmail?.trim() || 'support@nextgencto.com';

  const frameBottom = 36;
  const frameTop = PAGE_H - PAGE_MARGIN;
  ops.push(
    rect(FRAME_LEFT, frameBottom, FRAME_WIDTH, frameTop - frameBottom, COLORS.white, COLORS.cardBorder, 1),
  );

  const headerH = 78;
  const headerY = frameTop - headerH;
  ops.push(rect(FRAME_LEFT, headerY, FRAME_WIDTH, headerH, COLORS.headerBg));
  ops.push(rect(FRAME_LEFT, headerY - 3, FRAME_WIDTH, 3, COLORS.accent));

  const logoX = CONTENT_LEFT;
  const logoY = headerY + 14;
  const logoSize = 48;
  if (logoName) {
    ops.push('q');
    ops.push(`${logoSize} 0 0 ${logoSize} ${logoX} ${logoY} cm`);
    ops.push(`/${logoName} Do`);
    ops.push('Q');
  } else {
    ops.push(rect(logoX, logoY, logoSize, logoSize, [0.1, 0.12, 0.18], COLORS.accent, 1.5));
    ops.push(textAt(logoX + 10, logoY + 18, 'NG', { size: 16, font: 'F2', color: COLORS.accent }));
  }

  ops.push(
    textAt(logoX + logoSize + 12, headerY + 42, 'NextGen CTO', {
      size: 18,
      font: 'F2',
      color: COLORS.white,
    }),
  );
  ops.push(
    textAt(logoX + logoSize + 12, headerY + 24, receiptLabel, {
      size: 10,
      font: 'F1',
      color: COLORS.muted,
    }),
  );

  const badgeW = 58;
  const badgeH = 22;
  const badgeX = CONTENT_RIGHT - badgeW;
  const badgeY = headerY + 28;
  ops.push(rect(badgeX, badgeY, badgeW, badgeH, COLORS.paidBg));
  ops.push(textAt(badgeX + 14, badgeY + 7, 'PAID', { size: 10, font: 'F2', color: COLORS.paidText }));

  let y = headerY - 36;
  const leftX = CONTENT_LEFT;
  const rightX = DETAILS_LEFT;
  const detailsValueRight = DETAILS_RIGHT;
  const detailsLabelMaxW = Math.min(110, COL_WIDTH * 0.42);
  const detailsValueMaxW = Math.max(80, COL_WIDTH - detailsLabelMaxW - 8);

  ops.push(textAt(leftX, y, 'BILLED TO', { size: 9, font: 'F2', color: COLORS.muted }));
  ops.push(textAt(rightX, y, 'INVOICE DETAILS', { size: 9, font: 'F2', color: COLORS.muted }));
  y -= 18;

  ops.push(
    textAt(leftX, y, fitTextToWidth(model.customer.name, COL_WIDTH - 4, 13, 'F2'), {
      size: 13,
      font: 'F2',
      color: COLORS.body,
    }),
  );

  const detailRows: Array<[string, string]> = [
    ['Invoice number', model.invoiceNumber],
    ['Invoice date', model.issuedAtLabel],
  ];
  if (orderRef) detailRows.push(['Order reference', orderRef]);
  if (model.razorpayOrderId) detailRows.push(['Razorpay order', model.razorpayOrderId]);
  if (model.razorpayPaymentId) detailRows.push(['Payment ID', model.razorpayPaymentId]);

  let detailY = y;
  const detailFontSize = 10;
  const detailLineH = 12;
  for (const [label, value] of detailRows) {
    const valueLines = wrapTextToWidth(value, detailsValueMaxW, detailFontSize, 'F2', 2);
    ops.push(
      textAt(rightX, detailY, fitTextToWidth(label, detailsLabelMaxW, detailFontSize, 'F1'), {
        size: detailFontSize,
        color: COLORS.muted,
      }),
    );
    for (let i = 0; i < valueLines.length; i++) {
      const lineY = detailY - i * detailLineH;
      ops.push(
        textRight(detailsValueRight, lineY, valueLines[i]!, {
          size: detailFontSize,
          font: 'F2',
          color: COLORS.body,
          maxWidth: detailsValueMaxW,
        }),
      );
    }
    detailY -= Math.max(16, valueLines.length * detailLineH + 4);
  }

  y -= 16;
  ops.push(
    textAt(leftX, y, fitTextToWidth(model.customer.email, COL_WIDTH - 4, 11, 'F1'), {
      size: 11,
      color: COLORS.secondary,
    }),
  );
  y -= 16;
  if (model.customer.placeOfSupply) {
    ops.push(
      textAt(
        leftX,
        y,
        fitTextToWidth(`Place of supply: ${model.customer.placeOfSupply}`, COL_WIDTH - 4, 10, 'F1'),
        {
          size: 10,
          color: COLORS.muted,
        },
      ),
    );
    y -= 14;
  }

  y = Math.min(y, detailY) - 18;

  const cardH = 62;
  const cardY = y - cardH;
  ops.push(rect(FRAME_LEFT + 4, cardY, FRAME_WIDTH - 8, cardH, COLORS.cardBg, COLORS.cardBorder, 1));
  ops.push(textAt(leftX, cardY + 42, entityLabel, { size: 9, font: 'F2', color: COLORS.muted }));
  ops.push(
    textAt(leftX, cardY + 24, fitTextToWidth(primaryTitle, CONTENT_WIDTH - 8, 13, 'F2'), {
      size: 13,
      font: 'F2',
      color: COLORS.body,
    }),
  );
  ops.push(
    textAt(leftX, cardY + 10, 'Digital learning access on NextGen CTO', {
      size: 10,
      color: COLORS.secondary,
    }),
  );
  y = cardY - 22;

  const tableX = FRAME_LEFT + 4;
  const tableW = FRAME_WIDTH - 8;
  const colItem = tableW * 0.62;
  const tableRight = tableX + tableW - 10;
  ops.push(rect(tableX, y - 6, tableW, 22, COLORS.tableHead));
  ops.push(textAt(tableX + 10, y, 'ITEM', { size: 9, font: 'F2', color: COLORS.secondary }));
  ops.push(textAt(tableX + colItem + 8, y, 'QTY', { size: 9, font: 'F2', color: COLORS.secondary }));
  ops.push(
    textRight(tableRight, y, 'AMOUNT', {
      size: 9,
      font: 'F2',
      color: COLORS.secondary,
      maxWidth: 80,
    }),
  );
  y -= 28;

  for (const item of model.lineItems) {
    ops.push(
      textAt(
        tableX + 10,
        y,
        fitTextToWidth(item.title, colItem - 16, 11, 'F1'),
        { size: 11, color: COLORS.secondary },
      ),
    );
    ops.push(
      textAt(tableX + colItem + 14, y, String(item.qty), { size: 11, color: COLORS.secondary }),
    );
    ops.push(
      textRight(tableRight, y, formatMoney(item.amountMinor, model.currency), {
        size: 11,
        font: 'F2',
        color: COLORS.body,
        maxWidth: 100,
      }),
    );
    y -= 8;
    ops.push(rect(tableX, y, tableW, 0.6, COLORS.line));
    y -= 18;
  }

  y -= 6;
  const summaryRight = tableRight;
  const summaryLabelX = tableX + tableW - 180;
  const summaryMaxW = summaryRight - summaryLabelX - 8;

  const pushSummary = (label: string, value: string, bold = false) => {
    ops.push(
      textAt(summaryLabelX, y, label, {
        size: bold ? 12 : 11,
        font: bold ? 'F2' : 'F1',
        color: bold ? COLORS.body : COLORS.muted,
      }),
    );
    ops.push(
      textRight(summaryRight, y, value, {
        size: bold ? 14 : 11,
        font: 'F2',
        color: COLORS.body,
        maxWidth: summaryMaxW,
      }),
    );
    y -= 18;
  };

  pushSummary('Subtotal', formatMoney(model.subtotalMinor, model.currency));
  if (model.discountMinor > 0) {
    pushSummary('Discount', `-${formatMoney(model.discountMinor, model.currency)}`);
  }
  if (model.isGstInvoice) {
    pushSummary('Taxable value', formatMoney(model.taxableValueMinor, model.currency));
    if (model.cgstMinor > 0) pushSummary('CGST', formatMoney(model.cgstMinor, model.currency));
    if (model.sgstMinor > 0) pushSummary('SGST', formatMoney(model.sgstMinor, model.currency));
    if (model.igstMinor > 0) pushSummary('IGST', formatMoney(model.igstMinor, model.currency));
  }

  ops.push(rect(summaryLabelX, y + 8, 170, 1.5, COLORS.body));
  y -= 6;
  pushSummary('Total paid', formatMoney(model.totalMinor, model.currency), true);

  if (!model.isGstInvoice) {
    ops.push(
      textAt(leftX, y, 'Tax lines are not shown on this receipt.', {
        size: 10,
        color: COLORS.muted,
      }),
    );
    y -= 20;
  }

  y -= 8;
  ops.push(rect(FRAME_LEFT + 4, y + 10, FRAME_WIDTH - 8, 0.8, COLORS.line));
  y -= 8;
  ops.push(textAt(leftX, y, 'SUPPLIER', { size: 9, font: 'F2', color: COLORS.muted }));
  y -= 16;
  ops.push(
    textAt(leftX, y, fitTextToWidth(model.supplier.legalName, CONTENT_WIDTH - 4, 11, 'F1'), {
      size: 11,
      color: COLORS.secondary,
    }),
  );
  y -= 14;
  if (model.supplier.address) {
    ops.push(
      textAt(leftX, y, fitTextToWidth(model.supplier.address, CONTENT_WIDTH - 4, 10, 'F1'), {
        size: 10,
        color: COLORS.secondary,
      }),
    );
    y -= 14;
  }
  if (model.supplier.gstin) {
    ops.push(
      textAt(leftX, y, fitTextToWidth(`GSTIN: ${model.supplier.gstin}`, CONTENT_WIDTH - 4, 10, 'F1'), {
        size: 10,
        color: COLORS.secondary,
      }),
    );
    y -= 14;
  }
  if (model.supplier.sacCode) {
    ops.push(
      textAt(leftX, y, fitTextToWidth(`SAC: ${model.supplier.sacCode}`, CONTENT_WIDTH - 4, 10, 'F1'), {
        size: 10,
        color: COLORS.secondary,
      }),
    );
    y -= 14;
  }

  for (const w of model.metadataWarnings) {
    ops.push(
      textAt(leftX, y, fitTextToWidth(w, CONTENT_WIDTH - 4, 9, 'F1'), {
        size: 9,
        color: [0.706, 0.325, 0.035],
      }),
    );
    y -= 12;
  }

  y -= 10;
  ops.push(
    textAt(
      leftX,
      y,
      fitTextToWidth(
        'Thank you for learning with NextGen CTO. We appreciate your trust in our platform.',
        CONTENT_WIDTH - 4,
        11,
        'F1',
      ),
      { size: 11, color: COLORS.secondary },
    ),
  );
  y -= 16;
  ops.push(
    textAt(leftX, y, fitTextToWidth(`Support: ${support}`, CONTENT_WIDTH - 4, 10, 'F1'), {
      size: 10,
      color: COLORS.muted,
    }),
  );
  y -= 14;
  ops.push(
    textAt(
      leftX,
      y,
      fitTextToWidth(
        'This is a computer-generated invoice. No signature is required.',
        CONTENT_WIDTH - 4,
        9,
        'F1',
      ),
      {
        size: 9,
        color: COLORS.muted,
      },
    ),
  );

  return ops.join('\n');
}

/** Build a styled multi-section PDF matching the HTML invoice page. */
export function renderInvoicePdf(model: InvoicePdfModel): Uint8Array {
  const logo = loadLogo();
  const objects: Array<string | { header: string; binary: Buffer; footer: string }> = [];
  const offsets: number[] = [0];

  const add = (body: string | { header: string; binary: Buffer; footer: string }) => {
    objects.push(body);
    return objects.length;
  };

  let logoObjId: number | null = null;
  let logoName: string | null = null;
  if (logo) {
    const compressed = zlib.deflateSync(logo.rgb);
    logoObjId = add({
      header: [
        '<<',
        '/Type /XObject',
        '/Subtype /Image',
        `/Width ${logo.width}`,
        `/Height ${logo.height}`,
        '/ColorSpace /DeviceRGB',
        '/BitsPerComponent 8',
        '/Filter /FlateDecode',
        `/Length ${compressed.length}`,
        '>>',
        'stream\n',
      ].join('\n'),
      binary: compressed,
      footer: '\nendstream',
    });
    logoName = 'Im1';
  }

  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageOps = buildPageContent(model, logoName);
  const contentId = add(
    `<< /Length ${Buffer.byteLength(pageOps, 'utf8')} >>\nstream\n${pageOps}\nendstream`,
  );

  const xobjects =
    logoObjId && logoName ? `/XObject << /${logoName} ${logoObjId} 0 R >>` : '';
  const resources = `<< /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> ${xobjects} >>`;

  const pageId = add(
    `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentId} 0 R /Resources ${resources} >>`,
  );
  const pagesId = add(`<< /Type /Pages /Kids [ ${pageId} 0 R ] /Count 1 >>`);

  const pageObj = objects[pageId - 1];
  if (typeof pageObj === 'string') {
    objects[pageId - 1] = pageObj.replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  }

  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')];
  for (let i = 0; i < objects.length; i++) {
    offsets[i + 1] = parts.reduce((n, b) => n + b.length, 0);
    const obj = objects[i]!;
    if (typeof obj === 'string') {
      parts.push(Buffer.from(`${i + 1} 0 obj\n${obj}\nendobj\n`, 'utf8'));
    } else {
      parts.push(Buffer.from(`${i + 1} 0 obj\n${obj.header}`, 'utf8'));
      parts.push(obj.binary);
      parts.push(Buffer.from(`${obj.footer}\nendobj\n`, 'utf8'));
    }
  }

  const xrefStart = parts.reduce((n, b) => n + b.length, 0);
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  xref += `startxref\n${xrefStart}\n%%EOF`;
  parts.push(Buffer.from(xref, 'utf8'));

  return new Uint8Array(Buffer.concat(parts));
}

export function invoicePdfFilename(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^A-Za-z0-9._-]+/g, '-');
  return `invoice-${safe}.pdf`;
}
