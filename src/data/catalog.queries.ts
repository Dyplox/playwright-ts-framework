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
  const [product] = await plainPurchasableProducts(api, 1);
  if (!product) throw new Error('No purchasable product on page 1');
  return product;
}

/**
 * In-stock, non-rental products without location offers or eco discounts, so the expected
 * cart total is simply price x quantity.
 */
export async function plainPurchasableProducts(api: ApiClient, count: number): Promise<Product[]> {
  const { data } = await api.listProducts({ page: 1 });
  const products = data
    .filter((p) => p.in_stock && !p.is_rental && !p.is_location_offer && !p.is_eco_friendly)
    .slice(0, count);
  if (products.length < count) {
    throw new Error(`Expected ${count} plain purchasable products on page 1, found ${products.length}`);
  }
  return products;
}
