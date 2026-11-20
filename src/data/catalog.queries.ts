import type { ApiClient } from '../api/ApiClient';
import type { Product } from '../api/types';

/**
 * Test-data lookups against the catalog. They keep selection logic (and its guard clauses)
 * out of the specs, so tests stay linear and readable.
 */
export async function firstProduct(api: ApiClient): Promise<Product> {
  const [product] = (await api.listProducts({ page: 1 })).data;
  if (!product) throw new Error('Catalog is empty: is the database seeded?');
  return product;
}

export async function aPurchasableProduct(api: ApiClient): Promise<Product> {
  const { data } = await api.listProducts({ page: 1 });
  const product = data.find((p) => p.in_stock && !p.is_rental);
  if (!product) throw new Error('No in-stock, non-rental product on page 1');
  return product;
}
