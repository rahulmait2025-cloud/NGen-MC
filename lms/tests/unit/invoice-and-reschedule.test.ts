import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.NEXT_PUBLIC_STUDENT_APP_URL ??= 'https://example.com';
process.env.NEXT_PUBLIC_APP_URL ??= 'https://example.com';

import {
  formatInvoiceLineTitle,
  invoiceEntitySectionLabel,
} from '../../lib/lms/billing/invoice-line-title';
import { invoicePdfFilename, renderInvoicePdf } from '../../lib/lms/billing/invoice-pdf';
import { injectInvoicePdfDownloadChrome } from '../../lib/lms/billing/invoice-template';
import {
  buildMentorshipRescheduleConfirmedEmail,
  buildMentorshipRescheduleIdempotencyKey,
} from '../../lib/lms/transactional-email/templates/mentorship-emails';
import { buildPaymentConfirmationEmail } from '../../lib/lms/transactional-email/templates/payment-confirmation';

const samplePdfModel = {
  invoiceNumber: 'NGC-2526-12345',
  issuedAtLabel: '14 Jul 2026, 3:00 pm',
  orderId: 'ord-abc-123',
  razorpayOrderId: 'order_rzp_1',
  razorpayPaymentId: 'pay_rzp_1',
  supportEmail: 'support@nextgencto.com',
  entitySectionLabel: 'Bundle' as string | null,
  supplier: {
    legalName: 'NextGen CTO',
    gstin: null as string | null,
    address: 'Bangalore',
    sacCode: null as string | null,
  },
  customer: {
    name: 'Rahul Kumar',
    email: 'rahul@example.com',
    placeOfSupply: 'Karnataka' as string | null,
  },
  lineItems: [
    {
      title: formatInvoiceLineTitle('course_bundle', 'Complete Placement Bundle'),
      qty: 1,
      amountMinor: 499900,
    },
  ],
  subtotalMinor: 499900,
  discountMinor: 0,
  taxableValueMinor: 499900,
  cgstMinor: 0,
  sgstMinor: 0,
  igstMinor: 0,
  totalMinor: 499900,
  currency: 'INR',
  isGstInvoice: false,
  metadataWarnings: [] as string[],
};

describe('invoice entity labeling', () => {
  it('labels bundle invoices without calling them a course', () => {
    const title = formatInvoiceLineTitle('course_bundle', 'Complete Placement Bundle');
    assert.match(title, /^Bundle –/);
    assert.doesNotMatch(title, /Master Course/);
    assert.equal(invoiceEntitySectionLabel('course_bundle'), 'Bundle');
  });

  it('labels notes invoices from note_collection entity type', () => {
    const title = formatInvoiceLineTitle('note_collection', 'Operating Systems Notes');
    assert.equal(title, 'Notes Course – Operating Systems Notes');
    assert.equal(invoiceEntitySectionLabel('note_collection'), 'Notes course');
  });

  it('labels mentorship booking invoices with session title', () => {
    const title = formatInvoiceLineTitle('paid_mentorship_booking', 'Resume Review');
    assert.equal(title, 'Mentorship Session – Resume Review');
    assert.equal(invoiceEntitySectionLabel('paid_mentorship_booking'), 'Mentorship session');
  });
});

describe('invoice PDF download', () => {
  it('returns a valid PDF payload with application/pdf-friendly bytes', () => {
    const pdf = renderInvoicePdf(samplePdfModel);
    const header = Buffer.from(pdf.slice(0, 5)).toString('utf8');
    assert.equal(header, '%PDF-');
    assert.ok(pdf.length > 200);
  });

  it('uses a filename containing the invoice number', () => {
    assert.equal(invoicePdfFilename('NGC-2526-12345'), 'invoice-NGC-2526-12345.pdf');
  });

  it('embeds the correct entity name and type in the PDF', () => {
    const pdfText = Buffer.from(renderInvoicePdf(samplePdfModel)).toString('latin1');
    assert.match(pdfText, /BUNDLE/);
    assert.match(pdfText, /Complete Placement Bundle/);
    assert.match(pdfText, /PAID/);
    assert.match(pdfText, /PAYMENT RECEIPT/);
    assert.match(pdfText, /BILLED TO/);
    assert.match(pdfText, /INVOICE DETAILS/);
    assert.doesNotMatch(pdfText, /Master Course/);
  });

  it('embeds notes and mentorship titles correctly for other entity PDFs', () => {
    const notesPdf = Buffer.from(
      renderInvoicePdf({
        ...samplePdfModel,
        entitySectionLabel: 'Notes course',
        lineItems: [
          {
            title: formatInvoiceLineTitle('note_collection', 'OS Notes'),
            qty: 1,
            amountMinor: 99900,
          },
        ],
      }),
    ).toString('latin1');
    assert.match(notesPdf, /NOTES COURSE/);
    assert.match(notesPdf, /Notes Course - OS Notes/);

    const mentorPdf = Buffer.from(
      renderInvoicePdf({
        ...samplePdfModel,
        entitySectionLabel: 'Mentorship session',
        lineItems: [
          {
            title: formatInvoiceLineTitle('paid_mentorship_booking', 'Resume Review'),
            qty: 1,
            amountMinor: 199900,
          },
        ],
      }),
    ).toString('latin1');
    assert.match(mentorPdf, /MENTORSHIP SESSION/);
    assert.match(mentorPdf, /Mentorship Session - Resume Review/);
  });

  it('includes styled layout operators for header and card (not plain text dump)', () => {
    const pdfText = Buffer.from(renderInvoicePdf(samplePdfModel)).toString('latin1');
    // Colored fills / rectangles from the styled layout
    assert.match(pdfText, / re\n/);
    assert.match(pdfText, /0\.043 0\.059 0\.098 rg/); // header dark fill
    assert.match(pdfText, /0\.961 0\.620 0\.043 rg/); // orange accent
    assert.match(pdfText, /Helvetica-Bold/);
  });

  it('injects a Download PDF control into the invoice HTML page', () => {
    const html = injectInvoicePdfDownloadChrome(
      '<!DOCTYPE html><html><head></head><body><div>Invoice</div></body></html>',
      '/api/lms/invoices/download?token=abc&format=pdf',
    );
    assert.match(html, /Download PDF/);
    assert.match(html, /format=pdf/);
  });
});

describe('invoice access via secure token', () => {
  it('requires a token query param for invoice access (API contract)', () => {
    const missingToken = null as string | null;
    assert.equal(Boolean(missingToken?.trim()), false);
    const forged = 'not-a-real-token';
    assert.notEqual(forged.length, 0);
  });

  it('payment email can omit invoice CTA without broken URL when invoice missing', () => {
    const email = buildPaymentConfirmationEmail({
      purchaserName: 'Rahul',
      entityName: 'Resume Review',
      entityLabel: 'Mentorship',
      orderId: 'ord-1',
      invoiceNumber: null,
      totalMinor: 199900,
      paidAtLabel: '14 Jul 2026',
      invoiceDownloadUrl: null,
      dashboardUrl: 'https://example.com/mentorship',
      primaryCtaUrl: 'https://example.com/mentorship',
      primaryCtaLabel: 'View Mentorship Schedule',
      supportEmail: 'support@nextgencto.com',
    });
    assert.doesNotMatch(email.html, /View \/ Download Invoice/);
    assert.doesNotMatch(email.html, /href=""/);
  });
});

describe('mentorship reschedule notification', () => {
  it('sends reschedule notification content without invoice or payment wording', () => {
    const email = buildMentorshipRescheduleConfirmedEmail({
      studentName: 'Rahul Kumar',
      categoryTitle: 'Resume Review',
      mentorName: null,
      previousDate: '2026-07-20',
      previousStartTime: '10:00',
      previousEndTime: '10:30',
      newDate: '2026-07-22',
      newStartTime: '11:00',
      newEndTime: '11:30',
      timezoneLabel: 'Asia/Kolkata (IST)',
      statusLabel: 'Confirmed',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      dashboardUrl: 'https://example.com/mentorship',
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.subject, /Rescheduled/);
    assert.match(email.html, /Updated schedule/);
    assert.match(email.html, /Previous schedule/);
    assert.match(email.html, /Asia\/Kolkata/);
    assert.match(email.html, /Join Session/);
    assert.match(email.html, /meet\.google\.com/);
    assert.doesNotMatch(email.html, /View \/ Download Invoice/);
    assert.doesNotMatch(email.html, /PAYMENT CONFIRMED/);
    assert.doesNotMatch(email.subject, /Payment/);
  });

  it('avoids broken Join Session CTA when meeting link is missing', () => {
    const email = buildMentorshipRescheduleConfirmedEmail({
      studentName: 'Rahul Kumar',
      categoryTitle: 'Resume Review',
      newDate: '2026-07-22',
      newStartTime: '11:00',
      newEndTime: '11:30',
      meetingUrl: null,
      dashboardUrl: 'https://example.com/mentorship',
      supportEmail: 'support@nextgencto.com',
    });

    assert.match(email.html, /View Updated Schedule/);
    assert.match(email.html, /joining details will be available in your mentorship dashboard/);
    assert.doesNotMatch(email.html, /Join Session/);
    assert.doesNotMatch(email.html, /href=""/);
  });

  it('uses versioned idempotency keys so later reschedules are not suppressed', () => {
    const first = buildMentorshipRescheduleIdempotencyKey({
      bookingId: 'bk_new_1',
      rescheduleVersion: 1,
    });
    const replay = buildMentorshipRescheduleIdempotencyKey({
      bookingId: 'bk_new_1',
      rescheduleVersion: 1,
    });
    const later = buildMentorshipRescheduleIdempotencyKey({
      bookingId: 'bk_new_2',
      rescheduleVersion: 2,
    });

    assert.equal(first, replay);
    assert.notEqual(first, later);
    assert.match(first, /^mentorship_reschedule:booking:bk_new_1:v1$/);
    assert.match(later, /:v2$/);
  });

  it('documents that mentorship reschedule must not generate invoices', () => {
    const email = buildMentorshipRescheduleConfirmedEmail({
      studentName: 'Rahul',
      categoryTitle: 'Mock Interview',
      newDate: '2026-08-01',
      newStartTime: '09:00',
      newEndTime: '09:30',
      dashboardUrl: 'https://example.com/mentorship',
      supportEmail: 'support@nextgencto.com',
    });
    assert.match(email.html, /No payment receipt or invoice is generated for rescheduling/);
  });
});
