import 'server-only';

export type SupplierConfig = {
  legalName: string;
  gstin: string | null;
  billingAddress: string;
  billingState: string;
  billingStateCode: string;
  sacCode: string | null;
  taxRateBps: number;
  supportEmail: string;
  hasGst: boolean;
};

export function getSupplierConfig(): SupplierConfig {
  const legalName = process.env.NEXTGEN_LEGAL_NAME?.trim() || 'NextGen CTO';
  const gstin = process.env.NEXTGEN_GSTIN?.trim() || null;
  const billingAddress = process.env.NEXTGEN_BILLING_ADDRESS?.trim() || '';
  const billingState = process.env.NEXTGEN_BILLING_STATE?.trim() || '';
  const billingStateCode = process.env.NEXTGEN_BILLING_STATE_CODE?.trim() || '';
  const sacCode = process.env.NEXTGEN_INVOICE_SAC_CODE?.trim() || null;
  const taxRateRaw = process.env.NEXTGEN_INVOICE_TAX_RATE_BPS?.trim();
  const taxRateBps = taxRateRaw ? Number.parseInt(taxRateRaw, 10) : 0;
  const supportEmail = process.env.NEXTGEN_SUPPORT_EMAIL?.trim() || process.env.EMAIL_REPLY_TO?.trim() || 'support@nextgencto.com';
  const hasGst = Boolean(gstin && sacCode && taxRateBps > 0 && billingState);

  return {
    legalName,
    gstin: hasGst ? gstin : null,
    billingAddress,
    billingState,
    billingStateCode,
    sacCode: hasGst ? sacCode : null,
    taxRateBps: hasGst && Number.isFinite(taxRateBps) ? taxRateBps : 0,
    supportEmail,
    hasGst,
  };
}
