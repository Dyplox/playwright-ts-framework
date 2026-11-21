import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { firstProduct, plainPurchasableProducts } from '@data/catalog.queries';
import { createCart } from '@data/factories/cart.factory';
import { useCartInBrowser } from '@utils/browser-cart';

/**
 * WCAG 2.1 AA scans of the key pages. Each test waits for the page's real content before
 * scanning: auditing a half-rendered SPA gives false negatives.
 */
test.describe('Accessibility – public pages', { tag: '@a11y' }, () => {
  test('catalog', async ({ catalogPage, expectAccessible }) => {
    await catalogPage.goto();
    await expect(catalogPage.cards.first()).toBeVisible();
    await expectAccessible();
  });

  test('product detail', async ({ api, productPage, expectAccessible }) => {
    const product = await firstProduct(api);
    await productPage.goto(product.id);
    await expect(productPage.name).toHaveText(product.name);
    await expectAccessible();
  });

  test('login form', async ({ loginPage, expectAccessible }) => {
    await loginPage.goto();
    await expect(loginPage.submit).toBeVisible();
    await expectAccessible();
  });

  test('login form with validation errors', async ({ page, loginPage, expectAccessible }) => {
    await loginPage.goto();
    await loginPage.submit.click();
    await expect(page.getByTestId('email-error')).toBeVisible();
    // Error states are where accessibility usually breaks (contrast, live regions, labels).
    await expectAccessible();
  });

  test('register form', async ({ page, expectAccessible }) => {
    await page.goto('/auth/register');
    await expect(page.getByTestId('register-submit')).toBeVisible();
    await expectAccessible();
  });

  test('contact form', async ({ page, expectAccessible }) => {
    await page.goto('/contact');
    await expect(page.getByTestId('contact-submit')).toBeVisible();
    await expectAccessible();
  });
});

test.describe('Accessibility – customer area', { tag: '@a11y' }, () => {
  test.use({ role: 'customer' });

  test('my account', async ({ accountPage, expectAccessible }) => {
    await accountPage.goto();
    await expect(accountPage.title).toBeVisible();
    await expectAccessible();
  });

  test('my favorites', async ({ favoritesPage, expectAccessible }) => {
    await favoritesPage.goto();
    await expect(favoritesPage.title).toBeVisible();
    await expectAccessible();
  });

  test('my invoices', async ({ invoicesPage, expectAccessible }) => {
    await invoicesPage.goto();
    await expect(invoicesPage.title).toBeVisible();
    await expectAccessible();
  });

  test('checkout – cart step', async ({ api, page, checkoutPage, expectAccessible }) => {
    const [product] = await plainPurchasableProducts(api, 1);
    const cart = await createCart(api, [{ product: product!, quantity: 1 }]);
    await useCartInBrowser(page, env.baseURL, cart);

    await checkoutPage.goto();
    await expect(checkoutPage.cart.productTitles).toHaveCount(1);
    await expectAccessible();
  });
});
