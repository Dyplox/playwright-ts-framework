import type { Locator, Page } from '@playwright/test';

/** Top navigation. Composed into pages instead of inherited. */
export class HeaderComponent {
  readonly root: Locator;
  readonly signIn: Locator;
  readonly userMenu: Locator;
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    this.root = page.locator('app-header');
    this.signIn = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.homeLink = page.getByTestId('nav-home');
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
