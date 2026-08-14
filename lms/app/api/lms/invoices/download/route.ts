import { NextRequest, NextResponse } from 'next/server';
import { resolveInvoiceIdByDownloadToken } from '@/lib/lms/billing/invoice-download-token';
import { getInvoiceById, getInvoiceHtmlById } from '@/lib/lms/billing/invoices';
import { injectInvoicePdfDownloadChrome } from '@/lib/lms/billing/invoice-template';
import { invoicePdfFilename, renderInvoicePdf } from '@/lib/lms/billing/invoice-pdf';
import type { InvoicePdfModel } from '@/lib/lms/billing/invoice-pdf';
import { invoiceEntitySectionLabel } from '@/lib/lms/billing/invoice-line-title';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

function toPdfModel(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>): InvoicePdfModel {
  const supplier = (invoice.supplier_snapshot ?? {}) as Record<string, unknown>;
  const customer = (invoice.customer_snapshot ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const primaryType = lines[0]?.entity_type;

  return {
    invoiceNumber: invoice.invoice_number,
    issuedAtLabel: new Date(invoice.issued_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    orderId: invoice.order_id ?? invoice.note_payment_order_id,
    razorpayOrderId: invoice.razorpay_order_id,
    razorpayPaymentId: invoice.razorpay_payment_id,
    supportEmail: typeof supplier.supportEmail === 'string' ? supplier.supportEmail : null,
    entitySectionLabel: invoiceEntitySectionLabel(primaryType),
    supplier: {
      legalName: String(supplier.legalName ?? 'NextGen CTO'),
      gstin: (supplier.gstin as string | null) ?? null,
      address: String(supplier.billingAddress ?? supplier.address ?? ''),
      sacCode: (supplier.sacCode as string | null) ?? null,
    },
    customer: {
      name: String(customer.name ?? invoice.purchaser_name ?? invoice.purchaser_email),
      email: String(customer.email ?? invoice.purchaser_email),
      placeOfSupply:
        (customer.placeOfSupply as string | null) ?? invoice.place_of_supply ?? null,
    },
    lineItems: lines.map((l) => ({
      title: l.title,
      qty: l.qty,
      amountMinor: l.total_amount_minor,
    })),
    subtotalMinor: invoice.subtotal_minor,
    discountMinor: invoice.discount_minor,
    taxableValueMinor: invoice.taxable_value_minor,
    cgstMinor: invoice.cgst_minor,
    sgstMinor: invoice.sgst_minor,
    igstMinor: invoice.igst_minor,
    totalMinor: invoice.total_minor,
    currency: invoice.currency,
    isGstInvoice: Boolean(supplier.hasGst) || invoice.cgst_minor + invoice.sgst_minor + invoice.igst_minor > 0,
    metadataWarnings: [],
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const invoiceId = await resolveInvoiceIdByDownloadToken(token);
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const collegeSlug = request.nextUrl.searchParams.get('collegeSlug')?.trim() || 'global';
  const { getOptionalStudentRuntime } = await import('@/lib/student-runtime/runtime');
  const runtime = await getOptionalStudentRuntime(collegeSlug, { freshness: 'cached', fallbackOnIncomplete: true });
  if (!runtime) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const invoice = await getInvoiceById(invoiceId);
  if (
    !invoice ||
    (invoice.user_id && invoice.user_id !== runtime.identity.userId && invoice.student_id !== runtime.student.studentId)
  ) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[request-audit]', { action: 'invoice-ownership-denied', invoiceId: invoiceId.slice(0, 8) + '...' });
    }
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const format = request.nextUrl.searchParams.get('format')?.trim().toLowerCase();

  if (format === 'pdf') {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const pdfBytes = renderInvoicePdf(toPdfModel(invoice));
    const filename = invoicePdfFilename(invoice.invoice_number);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  const html = await getInvoiceHtmlById(invoiceId);
  if (!html) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const pdfUrl = `${request.nextUrl.pathname}?token=${encodeURIComponent(token)}${collegeSlug ? `&collegeSlug=${encodeURIComponent(collegeSlug)}` : ''}&format=pdf`;
  const withChrome = injectInvoicePdfDownloadChrome(html, pdfUrl);

  return new NextResponse(withChrome, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
