import { test, expect } from '@fixtures';
import type { APIResponse } from '@playwright/test';
import { env } from '@config/env';
import { OpenApiContract, type OpenApiDocument } from '@api/openapi';
import { CONTRACT_GAPS, stillReproduces, withoutKnownGaps } from '@api/contract-gaps';
import { UnauthorizedSchema, ValidationErrorSchema } from '@api/schemas';
import { firstProduct } from '@data/catalog.queries';
import { createCustomer } from '@data/factories/user.factory';

type Method = 'get' | 'post';

/**
 * Provider contract: the API must keep honoring the OpenAPI document it publishes.
 * (The consumer contract — what this framework needs — is enforced by ApiClient on every call.)
 */
test.describe('API contract (OpenAPI)', { tag: ['@api', '@contract'] }, () => {
  let contract: OpenApiContract;

  /** Validation errors for a response, minus the documented gaps. */
  const errorsFor = (method: Method, path: string, status: number, body: unknown) =>
    withoutKnownGaps(method, path, status, contract.validate(method, path, status, body));

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    const response = await request.get(`${env.apiURL}/docs`);
    expect(response.ok(), 'OpenAPI document is published at /docs').toBe(true);
    contract = new OpenApiContract((await response.json()) as OpenApiDocument);
    await request.dispose();
  });

  test('every operation the framework uses is still published', () => {
    const used = [
      ['get', '/products'],
      ['get', '/products/{productId}'],
      ['get', '/products/search'],
      ['post', '/users/login'],
      ['post', '/users/register'],
      ['get', '/users/me'],
      ['get', '/favorites'],
      ['post', '/favorites'],
      ['post', '/carts'],
      ['get', '/carts/{cartId}'],
      ['get', '/invoices'],
      ['get', '/postcode-lookup'],
    ] as const;

    const missing = used
      .filter(([m, p]) => !contract.hasOperation(m, p))
      .map(([m, p]) => `${m.toUpperCase()} ${p}`);
    expect(missing, 'operations removed or renamed in the spec').toEqual([]);
  });

  test('catalog responses match the published schemas', async ({ api }) => {
    const list = await api.raw('GET', '/products?page=1');
    expect(errorsFor('get', '/products', list.status(), await list.json())).toEqual([]);

    const product = await firstProduct(api);
    const detail = await api.raw('GET', `/products/${product.id}`);
    expect(errorsFor('get', '/products/{productId}', detail.status(), await detail.json())).toEqual([]);

    const missing = await api.raw('GET', '/products/does-not-exist');
    expect(missing.status()).toBe(404);
    expect(errorsFor('get', '/products/{productId}', 404, await missing.json())).toEqual([]);
  });

  test('customer responses match the published schemas', async ({ userApi }) => {
    const me = await userApi.raw('GET', '/users/me');
    expect(errorsFor('get', '/users/me', me.status(), await me.json())).toEqual([]);

    const favorites = await userApi.raw('GET', '/favorites');
    expect(errorsFor('get', '/favorites', favorites.status(), await favorites.json())).toEqual([]);

    const invoices = await userApi.raw('GET', '/invoices');
    expect(errorsFor('get', '/invoices', invoices.status(), await invoices.json())).toEqual([]);
  });

  test('protected endpoints reject anonymous calls with the documented 401', async ({ api }) => {
    const response = await api.raw('GET', '/users/me');

    expect(response.status()).toBe(401);
    expect(contract.documentedStatuses('get', '/users/me')).toContain('401');
    expect(errorsFor('get', '/users/me', 401, await response.json())).toEqual([]);
  });

  test('error bodies keep the shape clients depend on', async ({ api }) => {
    const login = await api.raw('POST', '/users/login', {
      email: 'nobody@example.com',
      password: 'Wrong-pass-1!',
    });
    expect(login.status()).toBe(401);
    expect(UnauthorizedSchema.safeParse(await login.json()).success).toBe(true);

    const register = await api.raw('POST', '/users/register', { first_name: '' });
    expect(register.status()).toBe(422);
    const errors = ValidationErrorSchema.parse(await register.json());
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(['first_name', 'last_name', 'email', 'password']),
    );
  });

  test('documented contract gaps still reproduce (keeps the gap list honest)', async ({ api }) => {
    // A brand-new customer has no invoices: the empty-page case of GET /invoices.
    const { credentials } = await createCustomer(api);
    const freshCustomer = api.withToken(
      (await api.login(credentials.email, credentials.password)).access_token,
    );

    const probes: Record<string, () => Promise<{ status: number; body: unknown }>> = {
      'post /users/login': () =>
        read(api.raw('POST', '/users/login', { email: 'nobody@example.com', password: 'x' })),
      'post /users/register': () => read(api.raw('POST', '/users/register', {})),
      'get /invoices': () => read(freshCustomer.raw('GET', '/invoices')),
    };

    for (const gap of CONTRACT_GAPS) {
      const probe = probes[`${gap.method} ${gap.path}`];
      expect(probe, `no probe for gap ${gap.method} ${gap.path}`).toBeDefined();
      const { status, body } = await probe!();
      expect(status, gap.note).toBe(gap.status);

      expect(stillReproduces(gap, contract, body), `Stale gap in src/api/contract-gaps.ts: ${gap.note}`).toBe(
        true,
      );
    }
  });
});

async function read(response: Promise<APIResponse>): Promise<{ status: number; body: unknown }> {
  const r = await response;
  return { status: r.status(), body: (await r.json()) as unknown };
}
