/**
 * Guest-safe campaign URLs → product detail on the marketing home route (`/`).
 *
 * Examples:
 * - `/?view=store&product=PROD-xxx&source=ss&discount=SUMMER80`
 * - `/?product=PROD-xxx&discount=SUMMER80`
 */
const STORE_VIEWS = new Set(['store', 'store-catalog', 'store_catalog', 'catalog']);

export function parsePublicProductDeepLink(search: string): {
  productId: string;
  discountCode?: string;
  /** UTM-style campaign source from `source=` (shown subtly on public product view). */
  source?: string;
} | null {
  const params = new URLSearchParams(
    search.startsWith('?') ? search : `?${search}`,
  );
  const productId = (params.get('product') || params.get('productId') || '').trim();
  if (!productId) return null;

  const rawView = (params.get('view') || '').trim().toLowerCase().replace(/_/g, '-');
  if (rawView && !STORE_VIEWS.has(rawView)) {
    return null;
  }

  const discount = (params.get('discount') || '').trim();
  const source = (params.get('source') || '').trim();
  return {
    productId,
    discountCode: discount || undefined,
    source: source || undefined,
  };
}
