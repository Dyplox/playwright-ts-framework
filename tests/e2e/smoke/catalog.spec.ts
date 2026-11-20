import { test, expect } from '@fixtures';
import type { Paginated, Product } from '@api/types';
import { firstProduct } from '@data/catalog.queries';

function isProductListing(method: string, url: string): boolean {
  const { pathname } = new URL(url);
  return ['GET', 'QUERY'].includes(method) && pathname.endsWith('/products');
}

test.describe('Catalog', { tag: '@smoke' }, () => {
  test('home renders exactly the products the API returned for page 1', async ({ page, catalogPage }) => {
    // Wait on the real request the UI makes (Toolshop uses the HTTP QUERY method for listings):
    // the grid must match what the backend answered, whatever the default sort or filters are.
    const productsResponse = page.waitForResponse(
      (r) => isProductListing(r.request().method(), r.url()) && r.ok(),
    );
    await catalogPage.goto();
    const body = (await (await productsResponse).json()) as Paginated<Product>;

    await expect(catalogPage.cards).toHaveCount(body.data.length);
    await expect(catalogPage.cards.getByTestId('product-name')).toHaveText(body.data.map((p) => p.name));
  });

  test('search shows only matching products', async ({ api, catalogPage }) => {
    const term = 'pliers';
    const expected = await api.searchProducts(term);

    await catalogPage.goto();
    await catalogPage.search(term);

    await expect(catalogPage.searchTerm).toHaveText(term);
    await expect(catalogPage.cards).toHaveCount(Math.min(expected.total, expected.per_page));
    for (const name of await catalogPage.productNames()) {
      expect(name).toMatch(/pliers/i);
    }
  });

  test('product detail shows the same name and price as the API', async ({
    api,
    page,
    catalogPage,
    productPage,
  }) => {
    const product = await firstProduct(api);

    await catalogPage.goto();
    await catalogPage.cardByName(product.name).open();

    await expect(page).toHaveURL(new RegExp(`/product/${product.id}$`));
    await expect(productPage.name).toHaveText(product.name);
    await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
  });
});
