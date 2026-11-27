import { test, expect } from '@fixtures';
import { aPurchasableProduct } from '@data/catalog.queries';

test.describe('Cart', { tag: '@smoke' }, () => {
  test('adding a product from its detail page updates the cart badge', async ({ api, productPage }) => {
    const product = await aPurchasableProduct(api);

    await productPage.goto(product.id);
    await productPage.addToCart(2);

    await expect(productPage.toast.message).toHaveText('Product added to shopping cart.');
    await expect(productPage.header.cartQuantity).toHaveText('3'); // DELIBERATE FAILURE: validates the red path of the pipeline
  });
});
