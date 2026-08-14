import 'server-only';

import { escapeHtml } from '@/lib/lms/transactional-email/escape';
import { renderInvoiceLogoImg } from './invoice-logo';

export type InvoiceRenderModel = {
  invoiceNumber: string;
  issuedAtLabel: string;
  orderId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  supportEmail?: string | null;
  /** Section heading above the purchased item (not always "Course"). */
  entitySectionLabel?: string | null;
  /** When set, injects a Download PDF control for browser views. */
  pdfDownloadUrl?: string | null;
  supplier: {
    legalName: string;
    gstin: string | null;
    address: string;
    state: string;
    stateCode: string;
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
  taxRateBps: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  totalMinor: number;
  currency: string;
  isGstInvoice: boolean;
  metadataWarnings: string[];
};

const currencyFormatterCache = new Map<string, Intl.NumberFormat>([
  ['INR', new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })],
]);

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let fmt = currencyFormatterCache.get(currency);
  if (!fmt) {
     
    fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
    currencyFormatterCache.set(currency, fmt);
  }
  return fmt;
}

function formatMoney(minor: number, currency: string): string {
  return getCurrencyFormatter(currency).format(minor / 100);
}

function refRow(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return `<tr><td style="padding:6px 0;font-size:12px;color:#64748B;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:12px;color:#0F172A;text-align:right;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}

/** Inject Download PDF chrome into a stored invoice HTML snapshot for browser viewing. */
export function injectInvoicePdfDownloadChrome(html: string, pdfDownloadUrl: string): string {
  if (!pdfDownloadUrl.trim()) return html;
  const toolbar = `<div class="invoice-toolbar no-print" style="max-width:820px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:12px;padding:0 4px;">
<a href="${escapeHtml(pdfDownloadUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0f172a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">Download PDF</a>
</div>`;
  const style = `<style>@media print{.no-print{display:none!important}}</style>`;
  if (html.includes('</body>')) {
    return html.replace('</head>', `${style}</head>`).replace('<body>', `<body>${toolbar}`);
  }
  return `${style}${toolbar}${html}`;
}

export function renderInvoiceHtml(model: InvoiceRenderModel): string {
  const primaryItem = model.lineItems[0]?.title ?? 'Purchase';
  const entitySection = model.entitySectionLabel?.trim() || 'Purchased item';
  const rows = model.lineItems
    .map(
      (line) =>
        `<tr>
          <td style="padding:12px 10px;border-bottom:1px solid #E5E7EB;font-size:14px;color:#334155;">${escapeHtml(line.title)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:14px;color:#334155;">${line.qty}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:14px;color:#0F172A;font-weight:600;">${formatMoney(line.amountMinor, model.currency)}</td>
        </tr>`,
    )
    .join('');

  const taxBlock = model.isGstInvoice
    ? `${model.discountMinor > 0 ? summaryRow('Discount', `-${formatMoney(model.discountMinor, model.currency)}`) : ''}
       ${summaryRow('Taxable value', formatMoney(model.taxableValueMinor, model.currency))}
       ${model.cgstMinor > 0 ? summaryRow('CGST', formatMoney(model.cgstMinor, model.currency)) : ''}
       ${model.sgstMinor > 0 ? summaryRow('SGST', formatMoney(model.sgstMinor, model.currency)) : ''}
       ${model.igstMinor > 0 ? summaryRow('IGST', formatMoney(model.igstMinor, model.currency)) : ''}`
    : '';

  const warnings =
    model.metadataWarnings.length > 0
      ? `<p style="margin:16px 0 0;font-size:12px;color:#b45309;">${model.metadataWarnings.map(escapeHtml).join(' ')}</p>`
      : '';

  const supplierLines = [
    escapeHtml(model.supplier.legalName),
    model.supplier.address ? escapeHtml(model.supplier.address) : '',
    model.supplier.gstin ? `GSTIN: ${escapeHtml(model.supplier.gstin)}` : '',
    model.supplier.sacCode ? `SAC: ${escapeHtml(model.supplier.sacCode)}` : '',
  ]
    .filter(Boolean)
    .join('<br/>');

  const supportEmail = model.supportEmail?.trim() || 'support@nextgencto.com';
  const orderRef =
    model.orderId && model.orderId.length >= 8
      ? model.orderId.slice(0, 8).toUpperCase()
      : model.orderId;

  const toolbar =
    model.pdfDownloadUrl?.trim()
      ? `<div class="invoice-toolbar no-print" style="max-width:820px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:12px;padding:0 4px;">
<a href="${escapeHtml(model.pdfDownloadUrl)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#0f172a;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">Download PDF</a>
</div>`
      : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${escapeHtml(model.invoiceNumber)}</title>
<style>
@media print{body{margin:0;padding:0}.no-print{display:none!important}}
body{margin:0;padding:32px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f8fafc;}
.wrap{max-width:820px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.06);}
</style></head><body>
${toolbar}
<div class="wrap">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F19;border-bottom:3px solid #F59E0B;">
<tr><td style="padding:22px 28px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="60" valign="middle">${renderInvoiceLogoImg()}</td>
<td valign="middle" style="padding-left:12px;">
<p style="margin:0;font-size:20px;font-weight:800;color:#fff;">NextGen CTO</p>
<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;">${model.isGstInvoice ? 'Tax Invoice' : 'Payment Receipt'}</p>
</td>
<td align="right" valign="middle">
<span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Paid</span>
</td></tr></table>
</td></tr></table>

<div style="padding:28px;">
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr>
<td width="50%" valign="top" style="padding-right:16px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Billed to</p>
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(model.customer.name)}</p>
<p style="margin:0;font-size:14px;color:#475569;">${escapeHtml(model.customer.email)}</p>
${model.customer.placeOfSupply ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;">Place of supply: ${escapeHtml(model.customer.placeOfSupply)}</p>` : ''}
</td>
<td width="50%" valign="top" style="padding-left:16px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Invoice details</p>
<table width="100%" cellpadding="0" cellspacing="0">
${refRow('Invoice number', model.invoiceNumber)}
${refRow('Invoice date', model.issuedAtLabel)}
${refRow('Order reference', orderRef ?? undefined)}
${refRow('Razorpay order', model.razorpayOrderId ?? undefined)}
${refRow('Payment ID', model.razorpayPaymentId ?? undefined)}
</table>
</td>
</tr>
</table>

<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:22px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(entitySection)}</p>
<p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(primaryItem)}</p>
<p style="margin:6px 0 0;font-size:13px;color:#475569;">Digital learning access on NextGen CTO</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">
<tr style="background:#f1f5f9;">
<th style="text-align:left;padding:12px 10px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
<th style="padding:12px 10px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
<th style="text-align:right;padding:12px 10px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
</tr>
${rows}
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:340px;margin-left:auto;">
${summaryRow('Subtotal', formatMoney(model.subtotalMinor, model.currency))}
${taxBlock}
<tr><td colspan="2" style="padding:14px 10px 0;border-top:2px solid #0f172a;font-size:15px;font-weight:800;color:#0f172a;">Total paid</td>
<td style="padding:14px 10px 0;border-top:2px solid #0f172a;text-align:right;font-size:18px;font-weight:800;color:#0f172a;">${formatMoney(model.totalMinor, model.currency)}</td></tr>
</table>

${model.isGstInvoice ? '' : `<p style="margin:16px 0 0;font-size:13px;color:#64748b;">Tax lines are not shown on this receipt.</p>`}

<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Supplier</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">${supplierLines}</p>
</div>

${warnings}

<p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#334155;">Thank you for learning with <strong>NextGen CTO</strong>. We appreciate your trust in our platform.</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b;">Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#d97a1f;">${escapeHtml(supportEmail)}</a></p>
<p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">This is a computer-generated invoice. No signature is required.</p>
</div>
</div>
</body></html>`;
}

function summaryRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 10px;font-size:14px;color:#64748b;text-align:right;">${escapeHtml(label)}</td>
    <td style="padding:8px 10px;font-size:14px;color:#0f172a;text-align:right;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}
