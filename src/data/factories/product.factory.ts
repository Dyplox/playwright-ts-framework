import { faker } from '@faker-js/faker';
import type { APIResponse } from '@playwright/test';
import type { ApiClient } from '../../api/ApiClient';
import type { CreatedProduct, NewProduct } from '../../api/types';
import { firstProduct } from '../catalog.queries';

/**
 * Creates a product through the admin API, reusing brand/category/image of an existing one.
 * The name carries a unique marker so searches never collide with seeded data.
 */
export async function createProduct(
  adminApi: ApiClient,
  catalogApi: ApiClient,
  overrides: Partial<NewProduct> = {},
): Promise<CreatedProduct> {
  const template = await firstProduct(catalogApi);
  if (!template.product_image) throw new Error('Template product has no image');
  const marker = faker.string.alpha({ length: 8, casing: 'upper' });
  return adminApi.createProduct({
    name: `PW Test Wrench ${marker}`,
    description: 'Created by the Playwright suite and removed after the test.',
    price: faker.number.float({ min: 5, max: 99, fractionDigits: 2 }),
    category_id: template.category.id,
    brand_id: template.brand.id,
    product_image_id: template.product_image.id,
    is_location_offer: false,
    is_rental: false,
    ...overrides,
  });
}

/** Cleanup for negative tests: deletes the product if the API (wrongly) created it. */
export async function removeIfCreated(adminApi: ApiClient, response: APIResponse): Promise<void> {
  if (response.status() !== 201) return;
  const { id } = (await response.json()) as { id: string };
  await adminApi.deleteProduct(id);
}
