import { test as base } from '@playwright/test';
import { AccountPage } from '../pages/AccountPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { InvoicesPage } from '../pages/InvoicesPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';

export interface PageFixtures {
  catalogPage: CatalogPage;
  productPage: ProductPage;
  loginPage: LoginPage;
  accountPage: AccountPage;
  checkoutPage: CheckoutPage;
  favoritesPage: FavoritesPage;
  invoicesPage: InvoicesPage;
}

/** Page objects are created on demand: a test only pays for what it destructures. */
export const pagesTest = base.extend<PageFixtures>({
  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  favoritesPage: async ({ page }, use) => use(new FavoritesPage(page)),
  invoicesPage: async ({ page }, use) => use(new InvoicesPage(page)),
});
