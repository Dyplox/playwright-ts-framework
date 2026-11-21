import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { plainPurchasableProducts } from '@data/catalog.queries';
import { createCart, type SeededCart } from '@data/factories/cart.factory';
import { mockPaymentDeclined, mockPostcodeLookupDown } from '@mocks/api-mocks';
import { useCartInBrowser } from '@utils/browser-cart';

const bankTransfer = {
  bankName: 'Bancolombia',
  accountName: 'Playwright Tester',
  accountNumber: '1234567890',
};

test.describe('Checkout', { tag: ['@e2e', '@regression'] }, () => {
  test.use({ authenticated: true });

  let cart: SeededCart;

  test.beforeEach(async ({ api, page }) => {
    // Arrange through the API: two products, three units. The UI only has to check out.
    const [first, second] = await plainPurchasableProducts(api, 2);
    cart = await createCart(api, [
      { product: first!, quantity: 1 },
      { product: second!, quantity: 2 },
    ]);
    await useCartInBrowser(page, env.baseURL, cart);
  });

  test('a signed-in customer pays by bank transfer and gets an invoice', async ({
    api,
    userApi,
    checkoutPage,
    invoicesPage,
  }) => {
    const me = await userApi.me();
    // The address step resolves street/city from postcode + house number. Ask the same
    // service what it will answer, so the expectation is exact instead of "not empty".
    const resolved = await api.postcodeLookup(
      me.address.country,
      me.address.postal_code,
      me.address.house_number,
    );

    await checkoutPage.goto();

    await test.step('cart shows the products seeded through the API', async () => {
      await expect(checkoutPage.cart.productTitles).toHaveText(cart.lines.map((l) => l.product.name));
      await expect(checkoutPage.cart.total).toHaveText(`$${cart.total.toFixed(2)}`);
      await expect(checkoutPage.header.cartQuantity).toHaveText(String(cart.quantity));
    });

    await test.step('billing address: postcode from the profile, street resolved by the lookup', async () => {
      await checkoutPage.continueAsLoggedInCustomer();
      await expect(checkoutPage.address.postalCode).toHaveValue(me.address.postal_code);
      await expect(checkoutPage.address.street).toHaveValue(resolved.street);
      await expect(checkoutPage.address.city).toHaveValue(resolved.city);
      await checkoutPage.confirmBillingAddress();
    });

    const invoiceNumber = await test.step('payment is validated and the order placed', async () => {
      await checkoutPage.payByBankTransfer(bankTransfer);
      await expect(checkoutPage.payment.successMessage).toHaveText('Payment was successful');
      await checkoutPage.placeOrder();
      await expect(checkoutPage.payment.orderConfirmation).toContainText(/Thanks for your order!.*INV-\d+/);
      return checkoutPage.confirmedInvoiceNumber();
    });

    await test.step('the invoice exists in the backend and in "My invoices"', async () => {
      const invoices = await userApi.listInvoices();
      const invoice = invoices.data.find((i) => i.invoice_number === invoiceNumber);
      expect(invoice, `invoice ${invoiceNumber} in GET /invoices`).toBeDefined();
      expect(invoice?.total).toBeCloseTo(cart.total, 2);
      expect(invoice?.billing_street).toBe(resolved.street);

      await invoicesPage.goto();
      await expect(invoicesPage.row(invoiceNumber)).toContainText(`$${cart.total.toFixed(2)}`);
    });
  });

  test(
    'a declined payment shows the reason and does not create an invoice',
    { tag: '@mock' },
    async ({ page, userApi, checkoutPage }) => {
      const invoicesBefore = (await userApi.listInvoices()).total;
      await mockPaymentDeclined(page, 'Payment declined by issuer');

      await checkoutPage.goto();
      await checkoutPage.continueAsLoggedInCustomer();
      await checkoutPage.confirmBillingAddress();
      await checkoutPage.payByBankTransfer(bankTransfer);

      await expect(checkoutPage.payment.errorMessage).toHaveText('Payment declined by issuer');
      await expect(checkoutPage.payment.orderConfirmation).toBeHidden();
      expect((await userApi.listInvoices()).total).toBe(invoicesBefore);
    },
  );

  test(
    'when the address lookup is down the customer is told why',
    { tag: '@mock' },
    async ({ page, checkoutPage }) => {
      await mockPostcodeLookupDown(page, 'Address lookup is temporarily unavailable');

      await checkoutPage.goto();
      await checkoutPage.continueAsLoggedInCustomer();

      await expect(checkoutPage.address.lookupError).toHaveText('Address lookup is temporarily unavailable');
      await expect(checkoutPage.address.street).toBeEditable();
    },
  );
});
