import { test, expect } from '@fixtures';
import { aPurchasableProduct } from '@data/catalog.queries';

test.describe('Favorites', { tag: ['@e2e', '@regression'] }, () => {
  test.use({ authenticated: true });

  test('a favorite created through the API shows up and can be removed in the UI', async ({
    api,
    userApi,
    favoritesPage,
  }) => {
    const product = await aPurchasableProduct(api);
    const favorite = await userApi.addFavorite(product.id);

    await favoritesPage.goto();
    await expect(favoritesPage.card(product.name)).toBeVisible();

    await favoritesPage.remove(product.name);

    await expect(favoritesPage.card(product.name)).toBeHidden();
    await expect
      .poll(async () => (await userApi.listFavorites()).some((f) => f.id === favorite.id), {
        message: 'favorite removed in the backend',
      })
      .toBe(false);
  });

  test('adding the same product twice is rejected with a clear message', async ({
    api,
    userApi,
    productPage,
  }) => {
    const product = await aPurchasableProduct(api);
    await userApi.addFavorite(product.id).catch(() => undefined); // already there from another test is fine

    await productPage.goto(product.id);
    await productPage.addToFavoritesButton.click();

    await expect(productPage.toast.message).toHaveText('Product already in your favorites list.');
  });
});
