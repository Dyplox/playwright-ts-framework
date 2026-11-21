import { test, expect } from '@fixtures';
import { firstProduct } from '@data/catalog.queries';
import { waitForVisualStability } from '@visual/stabilize';

/**
 * Visual regression on mobile, tablet and desktop (one Playwright project per viewport).
 * Baselines are generated on Linux in CI (see README > Visual baselines); comparison options
 * and the CSS that hides volatile widgets live in playwright.config.ts.
 */
test.describe('Visual – key pages', { tag: '@visual' }, () => {
  test('catalog', async ({ page, catalogPage }) => {
    await catalogPage.goto();
    await expect(catalogPage.cards).toHaveCount(9);
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('catalog.png', { fullPage: true });
  });

  test('product detail', async ({ api, page, productPage }) => {
    const product = await firstProduct(api);
    await productPage.goto(product.id);
    await expect(productPage.name).toHaveText(product.name);
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('product-detail.png', { fullPage: true });
  });

  test('login', async ({ page, loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.submit).toBeVisible();
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByTestId('contact-submit')).toBeVisible();
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('contact.png', { fullPage: true });
  });

  test('header navigation (responsive menu)', async ({ page, catalogPage }) => {
    await catalogPage.goto();
    await expect(catalogPage.cards.first()).toBeVisible();
    await waitForVisualStability(page);

    // Component-level snapshot: on mobile/tablet the menu collapses into a toggle.
    await expect(page.locator('app-header nav')).toHaveScreenshot('header.png');
  });
});
