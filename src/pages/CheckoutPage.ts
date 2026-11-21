import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';

export type PaymentMethod =
  'bank-transfer' | 'cash-on-delivery' | 'credit-card' | 'buy-now-pay-later' | 'gift-card';

export interface BankTransfer {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

/**
 * Payment form input keyed by the field's data-test id, e.g. { credit_card_number: '1111-...' }.
 * `monthly_installments` is a <select>; every other field is a text input.
 */
export type PaymentFields = Partial<
  Record<
    | 'bank_name'
    | 'account_name'
    | 'account_number'
    | 'gift_card_number'
    | 'validation_code'
    | 'credit_card_number'
    | 'expiration_date'
    | 'cvv'
    | 'card_holder_name'
    | 'monthly_installments',
    string
  >
>;

export interface GuestDetails {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Checkout wizard (/checkout): cart -> sign in -> billing address -> payment.
 * Each step is a small group of locators; the wizard keeps everything on one route.
 */
export class CheckoutPage {
  readonly header: HeaderComponent;

  readonly cart: {
    rows: Locator;
    productTitles: Locator;
    total: Locator;
    proceed: Locator;
  };

  readonly signIn: {
    proceedAsLoggedIn: Locator;
    guestTab: Locator;
    guestEmail: Locator;
    guestFirstName: Locator;
    guestLastName: Locator;
    guestSubmit: Locator;
    proceedAsGuest: Locator;
  };

  readonly address: {
    street: Locator;
    city: Locator;
    state: Locator;
    country: Locator;
    postalCode: Locator;
    houseNumber: Locator;
    lookupError: Locator;
    proceed: Locator;
  };

  readonly payment: {
    method: Locator;
    bankName: Locator;
    accountName: Locator;
    accountNumber: Locator;
    finish: Locator;
    successMessage: Locator;
    errorMessage: Locator;
    orderConfirmation: Locator;
  };

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
    const rows = page.locator('table tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cart = {
      rows,
      productTitles: rows.getByTestId('product-title'),
      total: page.getByTestId('cart-total'),
      proceed: page.getByTestId('proceed-1'),
    };
    this.signIn = {
      proceedAsLoggedIn: page.getByTestId('proceed-2'),
      guestTab: page.getByRole('tab', { name: 'Continue as Guest' }),
      guestEmail: page.getByTestId('guest-email'),
      guestFirstName: page.getByTestId('guest-first-name'),
      guestLastName: page.getByTestId('guest-last-name'),
      guestSubmit: page.getByTestId('guest-submit'),
      proceedAsGuest: page.getByTestId('proceed-2-guest'),
    };
    this.address = {
      street: page.getByTestId('street'),
      city: page.getByTestId('city'),
      state: page.getByTestId('state'),
      country: page.getByTestId('country'),
      postalCode: page.getByTestId('postal_code'),
      houseNumber: page.getByTestId('house_number'),
      lookupError: page.getByTestId('postcode-lookup-error'),
      proceed: page.getByTestId('proceed-3'),
    };
    this.payment = {
      method: page.getByTestId('payment-method'),
      bankName: page.getByTestId('bank_name'),
      accountName: page.getByTestId('account_name'),
      accountNumber: page.getByTestId('account_number'),
      finish: page.getByTestId('finish'),
      successMessage: page.getByTestId('payment-success-message'),
      errorMessage: page.getByTestId('payment-error-message'),
      orderConfirmation: page.locator('#order-confirmation'),
    };
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  /** Cart and sign-in steps for a customer who is already authenticated. */
  async continueAsLoggedInCustomer(): Promise<void> {
    await this.cart.proceed.click();
    await this.signIn.proceedAsLoggedIn.click();
  }

  /** Cart and sign-in steps without an account. */
  async continueAsGuest(guest: GuestDetails): Promise<void> {
    await this.cart.proceed.click();
    await this.signIn.guestTab.click();
    await this.signIn.guestEmail.fill(guest.email);
    await this.signIn.guestFirstName.fill(guest.firstName);
    await this.signIn.guestLastName.fill(guest.lastName);
    await this.signIn.guestSubmit.click();
    await this.signIn.proceedAsGuest.click();
  }

  /** Fills country + postcode + house number; street/city/state come from the postcode lookup. */
  async fillAddressForLookup(country: string, postalCode: string, houseNumber: string): Promise<void> {
    await this.address.country.selectOption(country);
    await this.address.postalCode.fill(postalCode);
    await this.address.houseNumber.fill(houseNumber);
  }

  async confirmBillingAddress(): Promise<void> {
    await this.address.proceed.click();
  }

  async payByBankTransfer(details: BankTransfer): Promise<void> {
    await this.payment.method.selectOption('bank-transfer');
    await this.payment.bankName.fill(details.bankName);
    await this.payment.accountName.fill(details.accountName);
    await this.payment.accountNumber.fill(details.accountNumber);
    // First click validates the payment, second click places the order.
    await this.payment.finish.click();
  }

  /** Selects a payment method and fills its fields (data-driven tests). Does not submit. */
  async fillPayment(method: PaymentMethod, fields: PaymentFields): Promise<void> {
    await this.payment.method.selectOption(method);
    for (const [testId, value] of Object.entries(fields)) {
      const field = this.page.getByTestId(testId);
      if (testId === 'monthly_installments') await field.selectOption(value);
      else await field.fill(value);
    }
  }

  /** Validation message rendered under the payment form. */
  paymentFieldError(message: string): Locator {
    return this.page.locator('form .alert-danger').filter({ hasText: message });
  }

  async placeOrder(): Promise<void> {
    await this.payment.finish.click();
  }

  /**
   * Invoice number from the confirmation text. Angular sanitizes the confirmation's
   * innerHTML (the `id` on its <span> is stripped), so read it from the visible text.
   */
  async confirmedInvoiceNumber(): Promise<string> {
    const text = await this.payment.orderConfirmation.innerText();
    const match = /INV-\d+/.exec(text);
    if (!match) throw new Error(`No invoice number in confirmation: "${text}"`);
    return match[0];
  }
}
