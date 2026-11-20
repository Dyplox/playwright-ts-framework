import type { Locator } from '@playwright/test';

/** One product card in the catalog grid, scoped to its own root locator. */
export class ProductCardComponent {
  readonly name: Locator;
  readonly price: Locator;
  readonly outOfStock: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('product-name');
    this.price = root.getByTestId('product-price');
    this.outOfStock = root.getByTestId('out-of-stock');
  }

  async open(): Promise<void> {
    await this.root.click();
  }
}
