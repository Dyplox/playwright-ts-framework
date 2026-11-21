import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { plainPurchasableProducts } from '@data/catalog.queries';
import { createCart } from '@data/factories/cart.factory';
import { useCartInBrowser } from '@utils/browser-cart';
import { auditA11y } from '@a11y/audit';
import { A11Y_EXCEPTIONS } from '@a11y/exceptions';

/**
 * Keeps the exceptions list honest: every documented exception must still reproduce.
 * When the app fixes a defect this test fails, prompting the removal of the stale entry
 * (otherwise it would silently hide a future regression of the same rule).
 */
test.describe('Accessibility – exceptions list', { tag: '@a11y' }, () => {
  test('every documented exception still reproduces', async ({ api, page, catalogPage }, testInfo) => {
    // Two full-page axe scans + API setup: allow more time when the machine is busy.
    test.slow();
    const matched = new Set<string>();
    const collect = async () => {
      const report = await auditA11y(page, testInfo);
      for (const a of report.accepted) matched.add(`${a.exception.rule}|${a.exception.target}`);
    };

    // A non-empty cart is needed for the header cart-link defect.
    const [product] = await plainPurchasableProducts(api, 1);
    await useCartInBrowser(page, env.baseURL, await createCart(api, [{ product: product!, quantity: 1 }]));

    await catalogPage.goto();
    await expect(catalogPage.cards.first()).toBeVisible();
    await expect(catalogPage.header.cartQuantity).toHaveText('1');
    await collect();

    await page.goto('/auth/register');
    await expect(page.getByTestId('register-submit')).toBeVisible();
    await collect();

    const stale = A11Y_EXCEPTIONS.filter((e) => !matched.has(`${e.rule}|${e.target}`)).map(
      (e) => `${e.rule} on "${e.target}"`,
    );
    expect(stale, 'Stale entries in src/a11y/exceptions.ts (defect fixed?)').toEqual([]);
  });
});
