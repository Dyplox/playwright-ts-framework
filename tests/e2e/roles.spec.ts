import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { createProduct } from '@data/factories/product.factory';

test.describe('Access control – UI', { tag: ['@e2e', '@regression'] }, () => {
  test('an anonymous visitor is sent to login from the customer area', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test.describe('as customer', () => {
    test.use({ role: 'customer' });

    test('the admin area is not reachable', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/auth\/login$/);
    });
  });

  test.describe('as admin', () => {
    test.use({ role: 'admin' });

    test('the admin menu and dashboard are available', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/admin\/dashboard$/);
      await page.getByTestId('nav-menu').click();
      await expect(page.getByTestId('nav-admin-products')).toBeVisible();
    });
  });
});

test.describe('Admin catalog management', { tag: ['@e2e', '@regression'] }, () => {
  test.skip(!env.ownsData, 'Creates catalog data: private environments only');

  test('a product created by an admin is searchable by shoppers, and gone once deleted', async ({
    api,
    adminApi,
    catalogPage,
    page,
  }) => {
    const product = await createProduct(adminApi, api);
    // Search by the unique marker: MariaDB FULLTEXT ignores words shorter than 3 characters.
    const term = product.name.split(' ').at(-1)!;

    try {
      await catalogPage.goto();
      await catalogPage.search(term);
      await expect(catalogPage.cards).toHaveCount(1);
      await expect(catalogPage.cardByName(product.name).price).toContainText(product.price.toFixed(2));
    } finally {
      await adminApi.deleteProduct(product.id);
    }

    await page.reload();
    await catalogPage.search(term);
    await expect(catalogPage.noResults).toBeVisible();
  });
});
