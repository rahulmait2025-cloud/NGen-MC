import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderById } from '@/lib/services/orders';
import { getStudentAppBaseUrl } from '@/lib/lms/transactional-email/student-app-base-url';
import { buildInvoiceNumberPrefix, getInvoiceFinancialYear } from './invoice-number';
import { createInvoiceDownloadToken } from './invoice-download-token';
import { getSupplierConfig } from './supplier-config';
import { renderInvoiceHtml } from './invoice-template';
import type { InvoiceRenderModel } from './invoice-template';
import { logInvoiceActorDebug, resolveOrderActors } from './resolve-order-actors';
import { formatInvoiceLineTitle, invoiceEntitySectionLabel } from './invoice-line-title';
import type { OrderWithItems, SellableEntityType } from '@/types/payments';

export type LmsInvoiceRecord = {
  id: string;
  order_id: string | null;
  note_payment_order_id?: string | null;
  invoice_number: string;
  html_snapshot: string | null;
};

type InvoiceLineItem = {
  title: string;
  entity_type: string;
  entity_id: string;
  qty: number;
  unit_amount_minor: number;
  total_amount_minor: number;
};

async function allocateInvoiceNumber(admin: ReturnType<typeof createAdminClient>, fy: string): Promise<string> {
  const prefix = buildInvoiceNumberPrefix(fy);
  const { data } = await admin
    .from('lms_invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  const last = data?.[0]?.invoice_number as string | undefined;
  const lastSeq = last ? Number.parseInt(last.replace(prefix, ''), 10) : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function batchResolveLineItemTitles(
  admin: ReturnType<typeof createAdminClient>,
  items: Array<{ entityType: string; entityId: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  const groupedIds: Record<string, string[]> = {};
  for (const item of items) {
    (groupedIds[item.entityType] ??= []).push(item.entityId);
  }

  const variantIds = groupedIds.course_variant ?? [];
  const courseIds = groupedIds.master_course ?? [];
  const bundleIds = groupedIds.course_bundle ?? [];
  const bootcampIds = groupedIds.job_ready_bootcamp ?? [];
  const noteIds = groupedIds.note_collection ?? [];
  const mentorshipIds = groupedIds.paid_mentorship_booking ?? [];

  const [variants, courses, bundles, bootcamps, notes, bookings] = await Promise.all([
    variantIds.length > 0
      ? admin.from('course_variants').select('id, title').in('id', variantIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? admin.from('master_courses').select('id, title').in('id', courseIds)
      : Promise.resolve({ data: [] }),
    bundleIds.length > 0
      ? admin.from('course_bundles').select('id, title').in('id', bundleIds)
      : Promise.resolve({ data: [] }),
    bootcampIds.length > 0
      ? admin.from('bootcamps').select('id, title').in('id', bootcampIds)
      : Promise.resolve({ data: [] }),
    noteIds.length > 0
      ? admin.from('note_collections').select('id, title').in('id', noteIds)
      : Promise.resolve({ data: [] }),
    mentorshipIds.length > 0
      ? admin
          .from('paid_mentorship_bookings')
          .select('id, category_id')
          .in('id', mentorshipIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const row of variants.data ?? []) {
    result.set(row.id as string, row.title as string);
  }
  for (const row of courses.data ?? []) {
    result.set(row.id as string, row.title as string);
  }
  for (const row of bundles.data ?? []) {
    result.set(row.id as string, row.title as string);
  }
  for (const row of bootcamps.data ?? []) {
    result.set(row.id as string, row.title as string);
  }
  for (const row of notes.data ?? []) {
    result.set(row.id as string, row.title as string);
  }

  const categoryIds = [
    ...new Set(
      (bookings.data ?? [])
        .map((b) => (b as { category_id?: string }).category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const categoryTitleById = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: categories } = await admin
      .from('paid_mentorship_categories')
      .select('id, title')
      .in('id', categoryIds);
    for (const row of categories ?? []) {
      categoryTitleById.set(row.id as string, row.title as string);
    }
  }
  for (const row of bookings.data ?? []) {
    const booking = row as { id: string; category_id?: string };
    result.set(
      booking.id,
      (booking.category_id ? categoryTitleById.get(booking.category_id) : undefined) ??
        'Mentorship Session',
    );
  }

  return result;
}

async function resolveLineItemTitles(
  admin: ReturnType<typeof createAdminClient>,
  items: Array<{ entity_type: string; entity_id: string }>,
): Promise<Map<string, string>> {
  const titles = await batchResolveLineItemTitles(
    admin,
    items.map((i) => ({ entityType: i.entity_type, entityId: i.entity_id })),
  );

  const result = new Map<string, string>();
  for (const item of items) {
    const raw =
      titles.get(item.entity_id) ||
      (item.entity_type === 'course_variant'
        ? 'Course variant'
        : item.entity_type === 'master_course'
          ? 'Course'
          : item.entity_type === 'course_bundle'
            ? 'Course bundle'
            : item.entity_type === 'job_ready_bootcamp'
              ? 'Job Ready Bootcamp'
              : item.entity_type === 'note_collection'
                ? 'Notes'
                : item.entity_type === 'paid_mentorship_booking'
                  ? 'Mentorship Session'
                  : 'Purchase');
    result.set(item.entity_id, formatInvoiceLineTitle(item.entity_type, raw));
  }
  return result;
}

function computeTax(params: {
  taxableValueMinor: number;
  taxRateBps: number;
  placeOfSupply: string;
  supplierState: string;
}): { cgst: number; sgst: number; igst: number } {
  if (params.taxRateBps <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  const taxTotal = Math.round((params.taxableValueMinor * params.taxRateBps) / 10000);
  const sameState =
    params.placeOfSupply.trim().toLowerCase() === params.supplierState.trim().toLowerCase();
  if (sameState) {
    const half = Math.floor(taxTotal / 2);
    return { cgst: half, sgst: taxTotal - half, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: taxTotal };
}

function resolveOrderLineItems(order: OrderWithItems): Array<{
  entity_type: string;
  entity_id: string;
  unit_amount_minor: number;
  total_amount_minor: number;
}> {
  if (order.order_items?.length > 0) {
    return order.order_items.map((item) => ({
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      unit_amount_minor: item.unit_amount_minor,
      total_amount_minor: item.total_amount_minor,
    }));
  }

  // Mentorship (and similar) may have no persisted order_items — synthesize in memory only.
  if (order.entity_type && order.entity_id) {
    return [
      {
        entity_type: order.entity_type,
        entity_id: order.entity_id,
        unit_amount_minor: order.base_amount_minor,
        total_amount_minor: order.total_amount_minor,
      },
    ];
  }

  return [];
}

async function buildDownloadUrl(invoiceId: string): Promise<string> {
  const appUrl = getStudentAppBaseUrl();
  const { plainToken } = await createInvoiceDownloadToken(invoiceId);
  return `${appUrl}/api/lms/invoices/download?token=${encodeURIComponent(plainToken)}`;
}

async function insertInvoiceRecord(params: {
  orderId?: string | null;
  notePaymentOrderId?: string | null;
  invoiceUserId: string;
  studentId: string | null;
  purchaserEmail: string;
  purchaserName: string | null;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxableValueMinor: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalMinor: number;
  placeOfSupply: string;
  supplier: ReturnType<typeof getSupplierConfig>;
  customer: InvoiceRenderModel['customer'];
  lineItems: InvoiceLineItem[];
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  issuedAt: string;
  htmlSnapshot: string;
  invoiceNumber: string;
  fy: string;
  lookup: { orderId?: string; notePaymentOrderId?: string };
}): Promise<{ invoice: LmsInvoiceRecord; downloadUrl: string; created: boolean }> {
  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from('lms_invoices')
    .insert({
      order_id: params.orderId ?? null,
      note_payment_order_id: params.notePaymentOrderId ?? null,
      invoice_number: params.invoiceNumber,
      invoice_financial_year: params.fy,
      user_id: params.invoiceUserId,
      student_id: params.studentId,
      purchaser_email: params.purchaserEmail,
      purchaser_name: params.purchaserName,
      currency: params.currency,
      subtotal_minor: params.subtotalMinor,
      discount_minor: params.discountMinor,
      taxable_value_minor: params.taxableValueMinor,
      tax_rate_bps: params.supplier.taxRateBps,
      cgst_minor: params.cgst,
      sgst_minor: params.sgst,
      igst_minor: params.igst,
      total_minor: params.totalMinor,
      place_of_supply: params.placeOfSupply,
      supplier_snapshot: params.supplier,
      customer_snapshot: params.customer,
      line_items: params.lineItems,
      razorpay_order_id: params.razorpayOrderId,
      razorpay_payment_id: params.razorpayPaymentId,
      html_snapshot: params.htmlSnapshot,
      issued_at: params.issuedAt,
    })
    .select('id, order_id, note_payment_order_id, invoice_number, html_snapshot')
    .single();

  if (error) {
    if (error.code === '23505') {
      let raceQuery = admin
        .from('lms_invoices')
        .select('id, order_id, note_payment_order_id, invoice_number, html_snapshot');
      if (params.lookup.orderId) {
        raceQuery = raceQuery.eq('order_id', params.lookup.orderId);
      } else if (params.lookup.notePaymentOrderId) {
        raceQuery = raceQuery.eq('note_payment_order_id', params.lookup.notePaymentOrderId);
      }
      const { data: race } = await raceQuery.maybeSingle();
      if (!race?.id) throw new Error(error.message);
      return {
        invoice: race as LmsInvoiceRecord,
        downloadUrl: await buildDownloadUrl(race.id as string),
        created: false,
      };
    }
    throw new Error(error.message);
  }

  return {
    invoice: inserted as LmsInvoiceRecord,
    downloadUrl: await buildDownloadUrl(inserted.id as string),
    created: true,
  };
}

export async function createOrGetInvoiceForPaidOrder(orderId: string): Promise<{
  invoice: LmsInvoiceRecord;
  downloadUrl: string;
  created: boolean;
}> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('lms_invoices')
    .select('id, order_id, note_payment_order_id, invoice_number, html_snapshot')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing?.id) {
    return {
      invoice: existing as LmsInvoiceRecord,
      downloadUrl: await buildDownloadUrl(existing.id as string),
      created: false,
    };
  }

  const order = await getOrderById(orderId);
  if (!order || order.status !== 'paid') {
    throw new Error('Order is not paid');
  }

  const supplier = getSupplierConfig();
  const warnings: string[] = [];
  let placeOfSupply = supplier.billingState;
  if (!placeOfSupply) {
    placeOfSupply = supplier.billingState || 'Not specified';
    warnings.push('Place of supply defaulted to supplier state.');
  }

  const sourceItems = resolveOrderLineItems(order);
  if (sourceItems.length === 0) {
    throw new Error(`No invoice line items for order ${order.id}`);
  }

  const titleMap = await resolveLineItemTitles(admin, sourceItems);

  const lineItems: InvoiceLineItem[] = sourceItems.map((item) => ({
    title: titleMap.get(item.entity_id) ?? formatInvoiceLineTitle(item.entity_type, 'Purchase'),
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    qty: 1,
    unit_amount_minor: item.unit_amount_minor,
    total_amount_minor: item.total_amount_minor,
  }));

  const subtotalMinor = order.base_amount_minor;
  const discountMinor = order.discount_amount_minor;
  const taxableValueMinor = Math.max(0, subtotalMinor - discountMinor);
  const { cgst, sgst, igst } = computeTax({
    taxableValueMinor,
    taxRateBps: supplier.taxRateBps,
    placeOfSupply,
    supplierState: supplier.billingState,
  });
  const taxTotal = cgst + sgst + igst;
  const totalMinor = taxableValueMinor + taxTotal;

  const fy = getInvoiceFinancialYear(new Date(order.paid_at ?? Date.now()));
  const [invoiceNumber, actors] = await Promise.all([
    allocateInvoiceNumber(admin, fy),
    resolveOrderActors(order),
  ]);
  void logInvoiceActorDebug(order.id, actors, order.purchaser_user_id);

  if (!actors.authUserId) {
    throw new Error(
      `Cannot create invoice: no auth.users id for order ${order.id} (${actors.authUserIdSource})`,
    );
  }

  const issuedAt = order.paid_at ?? new Date().toISOString();
  const primaryType = lineItems[0]?.entity_type as SellableEntityType | undefined;
  const htmlModel: InvoiceRenderModel = {
    invoiceNumber,
    issuedAtLabel: new Date(issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    orderId: order.id,
    razorpayOrderId: order.gateway_order_id,
    razorpayPaymentId: order.gateway_payment_id,
    supportEmail: supplier.supportEmail,
    supplier: {
      legalName: supplier.legalName,
      gstin: supplier.gstin,
      address: supplier.billingAddress,
      state: supplier.billingState,
      stateCode: supplier.billingStateCode,
      sacCode: supplier.sacCode,
    },
    customer: {
      name: order.purchaser_name ?? order.purchaser_email,
      email: order.purchaser_email,
      placeOfSupply,
    },
    lineItems: lineItems.map((l) => ({ title: l.title, qty: l.qty, amountMinor: l.total_amount_minor })),
    subtotalMinor,
    discountMinor,
    taxableValueMinor,
    taxRateBps: supplier.taxRateBps,
    cgstMinor: cgst,
    sgstMinor: sgst,
    igstMinor: igst,
    totalMinor,
    currency: order.currency,
    isGstInvoice: supplier.hasGst,
    metadataWarnings: warnings,
    entitySectionLabel: invoiceEntitySectionLabel(primaryType),
  };
  const htmlSnapshot = renderInvoiceHtml(htmlModel);

  return insertInvoiceRecord({
    orderId: order.id,
    notePaymentOrderId: null,
    invoiceUserId: actors.authUserId,
    studentId: actors.studentId,
    purchaserEmail: order.purchaser_email,
    purchaserName: order.purchaser_name,
    currency: order.currency,
    subtotalMinor,
    discountMinor,
    taxableValueMinor,
    cgst,
    sgst,
    igst,
    totalMinor,
    placeOfSupply,
    supplier,
    customer: htmlModel.customer,
    lineItems,
    razorpayOrderId: order.gateway_order_id,
    razorpayPaymentId: order.gateway_payment_id,
    issuedAt,
    htmlSnapshot,
    invoiceNumber,
    fy,
    lookup: { orderId: order.id },
  });
}

export async function createOrGetInvoiceForNotePaymentOrder(notePaymentOrderId: string): Promise<{
  invoice: LmsInvoiceRecord;
  downloadUrl: string;
  created: boolean;
}> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('lms_invoices')
    .select('id, order_id, note_payment_order_id, invoice_number, html_snapshot')
    .eq('note_payment_order_id', notePaymentOrderId)
    .maybeSingle();

  if (existing?.id) {
    return {
      invoice: existing as LmsInvoiceRecord,
      downloadUrl: await buildDownloadUrl(existing.id as string),
      created: false,
    };
  }

  const { data: noteOrder, error: noteOrderError } = await admin
    .from('note_payment_orders')
    .select(
      'id, student_id, note_collection_id, status, amount_minor, currency, gateway_order_id, gateway_payment_id, paid_at, metadata',
    )
    .eq('id', notePaymentOrderId)
    .maybeSingle();

  if (noteOrderError || !noteOrder) {
    throw new Error('Note payment order not found');
  }
  if (noteOrder.status !== 'paid') {
    throw new Error('Note payment order is not paid');
  }

  const amountRupees = Number(noteOrder.amount_minor) || 0;
  if (amountRupees <= 0) {
    throw new Error('Cannot invoice a free note purchase');
  }
  const totalMinorPaise = Math.round(amountRupees * 100);

  const { data: studentRow } = await admin
    .from('students')
    .select('id, user_id')
    .eq('id', noteOrder.student_id)
    .maybeSingle();

  const authUserId = (studentRow as { user_id?: string } | null)?.user_id;
  if (!authUserId) {
    throw new Error('Cannot create note invoice: missing auth user for student');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', authUserId)
    .maybeSingle();

  const purchaserEmail = profile?.email?.trim();
  if (!purchaserEmail) {
    throw new Error('Cannot create note invoice: missing purchaser email');
  }

  const titleMap = await resolveLineItemTitles(admin, [
    { entity_type: 'note_collection', entity_id: noteOrder.note_collection_id },
  ]);
  const lineTitle =
    titleMap.get(noteOrder.note_collection_id) ??
    formatInvoiceLineTitle('note_collection', 'Notes');

  const supplier = getSupplierConfig();
  const warnings: string[] = [];
  const placeOfSupply = supplier.billingState || 'Not specified';
  if (!supplier.billingState) {
    warnings.push('Place of supply defaulted to supplier state.');
  }

  const subtotalMinor = totalMinorPaise;
  const discountMinor = 0;
  const taxableValueMinor = subtotalMinor;
  const { cgst, sgst, igst } = computeTax({
    taxableValueMinor,
    taxRateBps: supplier.taxRateBps,
    placeOfSupply,
    supplierState: supplier.billingState,
  });
  const totalMinor = taxableValueMinor + cgst + sgst + igst;

  const issuedAt = noteOrder.paid_at ?? new Date().toISOString();
  const fy = getInvoiceFinancialYear(new Date(issuedAt));
  const invoiceNumber = await allocateInvoiceNumber(admin, fy);

  const lineItems: InvoiceLineItem[] = [
    {
      title: lineTitle,
      entity_type: 'note_collection',
      entity_id: noteOrder.note_collection_id,
      qty: 1,
      unit_amount_minor: totalMinorPaise,
      total_amount_minor: totalMinorPaise,
    },
  ];

  const customer = {
    name: profile?.full_name ?? purchaserEmail,
    email: purchaserEmail,
    placeOfSupply,
  };

  const htmlModel: InvoiceRenderModel = {
    invoiceNumber,
    issuedAtLabel: new Date(issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    orderId: noteOrder.id,
    razorpayOrderId: noteOrder.gateway_order_id,
    razorpayPaymentId: noteOrder.gateway_payment_id,
    supportEmail: supplier.supportEmail,
    supplier: {
      legalName: supplier.legalName,
      gstin: supplier.gstin,
      address: supplier.billingAddress,
      state: supplier.billingState,
      stateCode: supplier.billingStateCode,
      sacCode: supplier.sacCode,
    },
    customer,
    lineItems: lineItems.map((l) => ({ title: l.title, qty: l.qty, amountMinor: l.total_amount_minor })),
    subtotalMinor,
    discountMinor,
    taxableValueMinor,
    taxRateBps: supplier.taxRateBps,
    cgstMinor: cgst,
    sgstMinor: sgst,
    igstMinor: igst,
    totalMinor,
    currency: noteOrder.currency || 'INR',
    isGstInvoice: supplier.hasGst,
    metadataWarnings: warnings,
    entitySectionLabel: invoiceEntitySectionLabel('note_collection'),
  };

  return insertInvoiceRecord({
    orderId: null,
    notePaymentOrderId: noteOrder.id,
    invoiceUserId: authUserId,
    studentId: noteOrder.student_id,
    purchaserEmail,
    purchaserName: profile?.full_name ?? null,
    currency: noteOrder.currency || 'INR',
    subtotalMinor,
    discountMinor,
    taxableValueMinor,
    cgst,
    sgst,
    igst,
    totalMinor,
    placeOfSupply,
    supplier,
    customer,
    lineItems,
    razorpayOrderId: noteOrder.gateway_order_id,
    razorpayPaymentId: noteOrder.gateway_payment_id,
    issuedAt,
    htmlSnapshot: renderInvoiceHtml(htmlModel),
    invoiceNumber,
    fy,
    lookup: { notePaymentOrderId: noteOrder.id },
  });
}

export async function getInvoiceHtmlById(invoiceId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('lms_invoices')
    .select('html_snapshot, status')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!data || data.status !== 'issued') return null;
  return (data.html_snapshot as string) ?? null;
}

export async function getInvoiceById(invoiceId: string): Promise<{
  id: string;
  invoice_number: string;
  html_snapshot: string | null;
  status: string;
  user_id: string | null;
  student_id: string | null;
  line_items: InvoiceLineItem[] | null;
  purchaser_email: string;
  purchaser_name: string | null;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  taxable_value_minor: number;
  tax_rate_bps: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  total_minor: number;
  place_of_supply: string | null;
  supplier_snapshot: Record<string, unknown> | null;
  customer_snapshot: Record<string, unknown> | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  issued_at: string;
  order_id: string | null;
  note_payment_order_id: string | null;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('lms_invoices')
    .select(
      'id, invoice_number, html_snapshot, status, user_id, student_id, line_items, purchaser_email, purchaser_name, currency, subtotal_minor, discount_minor, taxable_value_minor, tax_rate_bps, cgst_minor, sgst_minor, igst_minor, total_minor, place_of_supply, supplier_snapshot, customer_snapshot, razorpay_order_id, razorpay_payment_id, issued_at, order_id, note_payment_order_id',
    )
    .eq('id', invoiceId)
    .maybeSingle();
  if (!data || data.status !== 'issued') return null;
  return data as never;
}
