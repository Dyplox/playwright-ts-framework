import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { removeIfCreated } from '@data/factories/product.factory';

test.describe('Access control – API', { tag: ['@api', '@regression'] }, () => {
  test('only admins can list users', async ({ userApi, adminApi }) => {
    expect((await userApi.raw('GET', '/users')).status()).toBe(403);
    expect((await adminApi.raw('GET', '/users')).status()).toBe(200);
  });

  test('a customer cannot delete products', async ({ api, userApi }) => {
    const { data } = await api.listProducts({ page: 1 });
    expect((await userApi.raw('DELETE', `/products/${data[0]!.id}`)).status()).toBe(403);
  });

  test(
    'anonymous users cannot create products',
    {
      annotation: {
        type: 'known defect',
        description:
          'Toolshop accepts POST /products without a token (201). Marked test.fail(): it will report ' +
          '"unexpected pass" as soon as the API is fixed, so the marker gets removed.',
      },
    },
    async ({ api, adminApi }) => {
      test.fail();
      test.skip(!env.ownsData, 'Would create real products on a shared environment');

      const template = (await api.listProducts({ page: 1 })).data[0]!;
      const response = await api.raw('POST', '/products', {
        name: 'Anonymous product (should be rejected)',
        description: 'x',
        price: 1,
        category_id: template.category.id,
        brand_id: template.brand.id,
        product_image_id: template.product_image?.id,
        is_location_offer: false,
        is_rental: false,
      });
      // While the defect exists the product IS created: remove it so it can't leak into
      // other tests (it showed up in "Related products" of the visual snapshots).
      await removeIfCreated(adminApi, response);

      expect([401, 403]).toContain(response.status());
    },
  );
});
