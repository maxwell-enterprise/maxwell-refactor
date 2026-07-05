import { STORE_PRODUCTS } from '../constants';
import { Product } from '../types/index';
import { DataService } from './dataService';

/** Resolve CMS commercial link — API catalog first, then legacy seed ids. */
export async function resolveLinkedProduct(
  productId: string,
): Promise<Product | null> {
  const trimmed = productId.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const fromApi = await DataService.getProductById(trimmed);
    if (fromApi) {
      return fromApi;
    }
  } catch {
    /* catalog lookup is best-effort */
  }

  return STORE_PRODUCTS.find((product) => product.id === trimmed) ?? null;
}
