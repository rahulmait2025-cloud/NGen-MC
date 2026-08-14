/**
 * Format a price for display.
 *
 * Note collections store prices in rupees (e.g. 780 = ₹780).
 * This function formats the number as currency for display.
 */
export function formatPrice(amount: number, currency: string): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}
