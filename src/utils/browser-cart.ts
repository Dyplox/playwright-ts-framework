import type { Page } from '@playwright/test';

/**
 * Toolshop keeps the cart id and the badge counter in `sessionStorage`, which `storageState`
 * does not persist. To reuse a cart created through the API, write those keys before any app
 * script runs. The init script only touches the app's origin.
 */
export async function useCartInBrowser(
  page: Page,
  baseURL: string,
  cart: { id: string; quantity: number },
): Promise<void> {
  await page.addInitScript(
    ({ origin, id, quantity }) => {
      if (window.location.origin !== origin) return;
      window.sessionStorage.setItem('cart_id', id);
      window.sessionStorage.setItem('cart_quantity', JSON.stringify(quantity));
    },
    { origin: new URL(baseURL).origin, id: cart.id, quantity: cart.quantity },
  );
}
