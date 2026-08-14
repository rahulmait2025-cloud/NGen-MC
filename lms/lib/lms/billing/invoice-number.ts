import 'server-only';

/** India FY label e.g. 2526 for Apr 2025 – Mar 2026 */
export function getInvoiceFinancialYear(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const endShort = (startYear + 1) % 100;
  return `${String(startYear).slice(-2)}${String(endShort).padStart(2, '0')}`;
}

export function buildInvoiceNumberPrefix(financialYear: string): string {
  return `NGC-${financialYear}-`;
}
