import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';

/** "My account" overview (/account). Requires an authenticated session. */
export class AccountPage {
  readonly header: HeaderComponent;
  readonly title: Locator;
  readonly favoritesLink: Locator;
  readonly profileLink: Locator;
  readonly invoicesLink: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.title = page.getByTestId('page-title');
    this.favoritesLink = page.getByTestId('nav-favorites');
    this.profileLink = page.getByTestId('nav-profile');
    this.invoicesLink = page.getByTestId('nav-invoices');
  }

  async goto(): Promise<void> {
    await this.page.goto('/account');
  }
}
