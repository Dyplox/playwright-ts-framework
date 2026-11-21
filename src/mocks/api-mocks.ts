import type { Page, Route } from '@playwright/test';
import type { Paginated, Product } from '../api/types';

/**
 * Network mocks built on `page.route`. They let the suite cover states the real backend
 * cannot produce on demand (empty catalog, declined payment, server errors, slow responses)
 * without touching the backend data.
 *
 * Patterns match the API path regardless of host, so they work in every environment.
 */
const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** The product listing (Toolshop sends it with the HTTP QUERY method). */
const PRODUCT_LISTING = /\/products(\?.*)?$/;

export async function mockEmptyCatalog(page: Page): Promise<void> {
  const empty: Paginated<Product> = {
    current_page: 1,
    data: [],
    from: null,
    last_page: 1,
    per_page: 9,
    to: null,
    total: 0,
  };
  await page.route(PRODUCT_LISTING, (route) => json(route, 200, empty));
}

/** Delays the product listing so loading states become observable. */
export async function delayCatalog(page: Page, ms: number): Promise<void> {
  await page.route(PRODUCT_LISTING, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

/**
 * The checkout resolves street/city/state from postcode + house number through
 * GET /postcode-lookup (a third-party provider in real life). Simulates that provider being down.
 *
 * Note: the happy path must NOT fake this answer: the backend re-validates city/state against
 * its own lookup when the invoice is created, so a fake address is (rightly) rejected with 422.
 */
export async function mockPostcodeLookupDown(page: Page, message: string): Promise<void> {
  await page.route(/\/postcode-lookup(\?.*)?$/, (route) => json(route, 503, { message }));
}

export async function mockPaymentDeclined(page: Page, error = 'Payment declined by issuer'): Promise<void> {
  await page.route(/\/payment\/check$/, (route) => json(route, 400, { error }));
}

/** Fails "add to cart" (POST /carts/{id}) with the given status and message. */
export async function mockAddToCartFailure(page: Page, status: number, message: string): Promise<void> {
  await page.route(/\/carts\/[^/]+$/, (route) =>
    route.request().method() === 'POST' ? json(route, status, { message }) : route.fallback(),
  );
}
