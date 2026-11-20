import { test, expect } from '@fixtures';
import { env } from '@config/env';

test.describe('API health', { tag: ['@smoke', '@api'] }, () => {
  test('status endpoint answers with the app version', async ({ request }) => {
    const response = await request.get(`${env.apiURL}/status`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ app_name: 'Toolshop', version: expect.any(String) });
  });

  test('products list is paginated (9 per page)', async ({ api }) => {
    const page1 = await api.listProducts({ page: 1 });

    expect(page1.per_page).toBe(9);
    expect(page1.data).toHaveLength(9);
    expect(page1.total).toBeGreaterThan(page1.per_page);
  });
});
