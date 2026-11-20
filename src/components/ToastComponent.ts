import type { Locator, Page } from '@playwright/test';

/** ngx-toastr notifications. */
export class ToastComponent {
  readonly message: Locator;

  constructor(page: Page) {
    this.message = page.locator('#toast-container').getByRole('alert');
  }
}
