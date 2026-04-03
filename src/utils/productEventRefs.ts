import type { Product, ProductItem } from '../types/index';

function collectFromItems(items: ProductItem[] | undefined, out: Set<string>): void {
  if (!items) return;
  for (const item of items) {
    if (item.type === 'TICKET' && item.meta?.eventId) {
      out.add(String(item.meta.eventId));
    }
    if (item.type === 'RECURRING_PASS' && item.meta?.eventId) {
      out.add(String(item.meta.eventId));
    }
  }
}

/** Event IDs referenced by product bundles (tickets / recurring passes). */
export function collectEventIdsFromProduct(product: Product): string[] {
  const ids = new Set<string>();
  collectFromItems(product.items, ids);
  if (product.hasVariants && product.variants) {
    for (const v of product.variants) {
      collectFromItems(v.items, ids);
    }
  }
  return [...ids];
}

export function collectEventIdsFromProducts(products: Product[]): string[] {
  const ids = new Set<string>();
  for (const p of products) {
    for (const id of collectEventIdsFromProduct(p)) {
      ids.add(id);
    }
  }
  return [...ids];
}
