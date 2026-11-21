import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { ProductCardComponent } from '../components/ProductCardComponent';

/** Home page: product grid, search, filters and sorting. */
export class CatalogPage {
  readonly header: HeaderComponent;
  readonly cards: Locator;
  /** Placeholder cards rendered while the listing is loading. */
  readonly skeletons: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchTerm: Locator;
  readonly noResults: Locator;
  readonly sort: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.cards = page.locator('a.card[data-test^="product-"]');
    this.skeletons = page.locator('.card.skeleton');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchTerm = page.getByTestId('search-term');
    this.noResults = page.getByTestId('no-results');
    this.sort = page.getByTestId('sort');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  card(index: number): ProductCardComponent {
    return new ProductCardComponent(this.cards.nth(index));
  }

  cardByName(name: string): ProductCardComponent {
    return new ProductCardComponent(
      this.cards.filter({ has: this.page.getByTestId('product-name').getByText(name, { exact: true }) }),
    );
  }

  /** Names currently rendered in the grid, in order. */
  async productNames(): Promise<string[]> {
    const names = await this.cards.getByTestId('product-name').allInnerTexts();
    return names.map((n) => n.trim());
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
  }
}
