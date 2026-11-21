import { test, expect } from '@fixtures';
import { expectVisibleFocus, tabTo } from '@a11y/keyboard';

/** What axe can't see: operating the app with the keyboard only. */
test.describe('Keyboard accessibility', { tag: '@a11y' }, () => {
  test('header navigation is reachable from the top of the page', async ({ page, catalogPage }) => {
    await catalogPage.goto();
    await expect(catalogPage.cards.first()).toBeVisible();

    const presses = await tabTo(page, catalogPage.header.signIn, 10);
    await expectVisibleFocus(catalogPage.header.signIn);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/auth\/login$/);
    expect(presses, 'Tab presses to reach "Sign in"').toBeLessThanOrEqual(10);
  });

  test('login can be completed with the keyboard only, in a logical focus order', async ({
    page,
    customer,
    loginPage,
    accountPage,
  }) => {
    await loginPage.goto();
    await loginPage.email.focus();
    await expectVisibleFocus(loginPage.email);
    await page.keyboard.type(customer.email);

    await page.keyboard.press('Tab');
    await expectVisibleFocus(loginPage.password);
    await page.keyboard.type(customer.password);

    // Password visibility toggle sits between the field and the submit button.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expectVisibleFocus(loginPage.submit);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/account$/);
    await expect(accountPage.title).toHaveText('My account');
  });

  test('search works with the keyboard (Enter submits)', async ({ page, catalogPage }) => {
    await catalogPage.goto();
    await catalogPage.searchInput.focus();
    await page.keyboard.type('hammer');
    await page.keyboard.press('Enter');

    await expect(catalogPage.searchTerm).toHaveText('hammer');
    await expect(catalogPage.cards.first()).toBeVisible();
  });
});
