import { test, expect } from '@fixtures';
import { aPurchasableProduct } from '@data/catalog.queries';
import { delayCatalog, mockAddToCartFailure, mockEmptyCatalog } from '@mocks/api-mocks';

test.describe('States driven by network mocks', { tag: ['@e2e', '@mock'] }, () => {
  test('empty catalog shows the "no results" message', async ({ page, catalogPage }) => {
    await mockEmptyCatalog(page);

    await catalogPage.goto();

    await expect(catalogPage.noResults).toBeVisible();
    await expect(catalogPage.cards).toHaveCount(0);
  });

  test('a slow catalog shows loading placeholders until products arrive', async ({ page, catalogPage }) => {
    await delayCatalog(page, 2_000);

    await catalogPage.goto();

    await expect(catalogPage.skeletons.first()).toBeVisible();
    await expect(catalogPage.cards.first()).toBeVisible({ timeout: 10_000 });
    await expect(catalogPage.skeletons).toHaveCount(0);
  });

  test('a server error on "add to cart" is reported and the badge stays empty', async ({
    api,
    page,
    productPage,
  }) => {
    const product = await aPurchasableProduct(api);
    await mockAddToCartFailure(page, 422, 'Product is out of stock');

    await productPage.goto(product.id);
    await productPage.addToCart(1);

    await expect(productPage.toast.message).toHaveText('Product is out of stock');
    await expect(productPage.header.cartQuantity).toBeHidden();
  });
});
