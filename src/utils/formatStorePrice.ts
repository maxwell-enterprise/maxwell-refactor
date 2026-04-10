const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/**
 * Display rule: **Rp 0 = Gratis**; positive amounts show formatted IDR.
 */
export function formatStorePriceIdr(amount: number): string {
  if (amount === 0) return 'Gratis';
  return idr.format(amount);
}
