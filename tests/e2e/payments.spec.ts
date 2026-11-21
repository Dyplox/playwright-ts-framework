import { test, expect } from '@fixtures';
import { env } from '@config/env';
import { plainPurchasableProducts } from '@data/catalog.queries';
import { createCart } from '@data/factories/cart.factory';
import { UserBuilder } from '@data/builders/UserBuilder';
import type { PaymentFields, PaymentMethod } from '@pages/CheckoutPage';
import { useCartInBrowser } from '@utils/browser-cart';

/** An expiration date always in the future, in the MM/YYYY format the form expects. */
const nextYear = `12/${new Date().getFullYear() + 1}`;

/** Data-driven: one row per payment method. Adding a method is adding a row. */
const validPayments: Array<{ method: PaymentMethod; fields: PaymentFields }> = [
  {
    method: 'bank-transfer',
    fields: { bank_name: 'Bancolombia', account_name: 'Ana Gomez', account_number: '123456789' },
  },
  { method: 'cash-on-delivery', fields: {} },
  {
    method: 'credit-card',
    fields: {
      credit_card_number: '4111-1111-1111-1111',
      expiration_date: nextYear,
      cvv: '123',
      card_holder_name: 'Ana Gomez',
    },
  },
  { method: 'buy-now-pay-later', fields: { monthly_installments: '6' } },
  { method: 'gift-card', fields: { gift_card_number: 'ABCD1234EFGH5678', validation_code: 'X9Y8' } },
];

/** Boundary and format cases for the client-side validation of each method. */
const invalidPayments: Array<{ name: string; method: PaymentMethod; fields: PaymentFields; error: string }> =
  [
    {
      name: 'bank name with digits',
      method: 'bank-transfer',
      fields: { bank_name: 'Bank 123', account_name: 'Ana', account_number: '123' },
      error: 'Bank name can only contain letters and spaces.',
    },
    {
      name: 'non-numeric account number',
      method: 'bank-transfer',
      fields: { bank_name: 'Bank', account_name: 'Ana', account_number: '12-34' },
      error: 'Account number must be numeric.',
    },
    {
      name: 'card number without dashes',
      method: 'credit-card',
      fields: {
        credit_card_number: '4111111111111111',
        expiration_date: nextYear,
        cvv: '123',
        card_holder_name: 'Ana',
      },
      error: 'Invalid card number format.',
    },
    {
      name: 'expired card',
      method: 'credit-card',
      fields: {
        credit_card_number: '4111-1111-1111-1111',
        expiration_date: '01/2020',
        cvv: '123',
        card_holder_name: 'Ana',
      },
      error: 'Expiration date must be in the future.',
    },
    {
      name: 'two-digit CVV',
      method: 'credit-card',
      fields: {
        credit_card_number: '4111-1111-1111-1111',
        expiration_date: nextYear,
        cvv: '12',
        card_holder_name: 'Ana',
      },
      error: 'CVV must be 3 or 4 digits.',
    },
    {
      name: 'gift card with 15 characters',
      method: 'gift-card',
      fields: { gift_card_number: 'ABCD1234EFGH567', validation_code: 'X9Y8' },
      error: 'Please enter a valid gift card number',
    },
  ];

test.describe('Payment methods', { tag: ['@e2e', '@regression'] }, () => {
  test.use({ role: 'customer' });

  test.beforeEach(async ({ api, page, checkoutPage }) => {
    const [product] = await plainPurchasableProducts(api, 1);
    await useCartInBrowser(page, env.baseURL, await createCart(api, [{ product: product!, quantity: 1 }]));
    await checkoutPage.goto();
    await checkoutPage.continueAsLoggedInCustomer();
    await checkoutPage.confirmBillingAddress();
  });

  for (const { method, fields } of validPayments) {
    test(`${method} is accepted`, async ({ checkoutPage }) => {
      await checkoutPage.fillPayment(method, fields);
      await checkoutPage.payment.finish.click();

      await expect(checkoutPage.payment.successMessage).toHaveText('Payment was successful');
    });
  }

  for (const { name, method, fields, error } of invalidPayments) {
    test(`${method}: ${name} is rejected before submitting`, async ({ checkoutPage }) => {
      await checkoutPage.fillPayment(method, fields);
      await checkoutPage.payment.method.focus(); // blur the last field so its validation renders

      await expect(checkoutPage.paymentFieldError(error)).toBeVisible();
      await expect(checkoutPage.payment.finish).toBeDisabled();
    });
  }
});

test.describe('Guest checkout', { tag: ['@e2e', '@regression'] }, () => {
  test('a guest can order without an account', async ({ api, page, checkoutPage }) => {
    const [product] = await plainPurchasableProducts(api, 1);
    await useCartInBrowser(page, env.baseURL, await createCart(api, [{ product: product!, quantity: 1 }]));
    const guest = UserBuilder.aCustomer().build();
    const address = await api.postcodeLookup('NL', guest.address.postal_code, guest.address.house_number);

    await checkoutPage.goto();
    await checkoutPage.continueAsGuest({
      email: guest.email,
      firstName: guest.first_name,
      lastName: guest.last_name,
    });
    await checkoutPage.fillAddressForLookup('NL', guest.address.postal_code, guest.address.house_number!);
    await expect(checkoutPage.address.street).toHaveValue(address.street);
    await checkoutPage.confirmBillingAddress();

    await checkoutPage.fillPayment('cash-on-delivery', {});
    await checkoutPage.payment.finish.click();
    await expect(checkoutPage.payment.successMessage).toHaveText('Payment was successful');
    await checkoutPage.placeOrder();

    await expect(checkoutPage.payment.orderConfirmation).toContainText(/Thanks for your order!.*INV-\d+/);
  });
});
