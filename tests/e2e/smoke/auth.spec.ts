import { test, expect } from '@fixtures';

test.describe('Authenticated session (API login + storageState)', { tag: '@smoke' }, () => {
  test.use({ role: 'customer' });

  test('lands on My account without touching the login form', async ({ page, userApi, accountPage }) => {
    const me = await userApi.me();

    await accountPage.goto();

    await expect(page).toHaveURL(/\/account$/);
    await expect(accountPage.title).toHaveText('My account');
    await expect(accountPage.header.userMenu).toContainText(me.first_name);
    await expect(accountPage.header.signIn).toBeHidden();
  });
});

test.describe('Login form', { tag: '@smoke' }, () => {
  // The only place where the UI login is exercised: it is the feature under test here.
  test('a customer can sign in with valid credentials', async ({
    page,
    customer,
    loginPage,
    accountPage,
  }) => {
    await loginPage.goto();
    await loginPage.login(customer.email, customer.password);

    await expect(page).toHaveURL(/\/account$/);
    await expect(accountPage.title).toHaveText('My account');
  });

  test('wrong password shows an error and keeps the user signed out', async ({ customer, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(customer.email, 'Not-The-Password-123!');

    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(loginPage.submit).toBeVisible();
  });
});
