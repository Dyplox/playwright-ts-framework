import type { Locator, Page } from '@playwright/test';

/** My favorites (/account/favorites). */
export class FavoritesPage {
  readonly title: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByTestId('page-title');
    this.cards = page.locator('[data-test^="favorite-"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/account/favorites');
  }

  card(productName: string): Locator {
    return this.cards.filter({
      has: this.page.getByTestId('product-name').getByText(productName, { exact: true }),
    });
  }

  async remove(productName: string): Promise<void> {
    await this.card(productName).getByTestId('delete').click();
  }
}
