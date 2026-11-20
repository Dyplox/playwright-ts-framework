import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';
import { ToastComponent } from '../components/ToastComponent';

/** Product detail page (/product/:id). */
export class ProductPage {
  readonly header: HeaderComponent;
  readonly toast: ToastComponent;
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly description: Locator;
  readonly quantity: Locator;
  readonly addToCartButton: Locator;
  readonly addToFavoritesButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    this.toast = new ToastComponent(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.quantity = page.getByTestId('quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.addToFavoritesButton = page.getByTestId('add-to-favorites');
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/product/${productId}`);
  }

  async addToCart(quantity = 1): Promise<void> {
    await this.quantity.fill(String(quantity));
    await this.addToCartButton.click();
  }
}
