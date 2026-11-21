import { test, expect } from '@playwright/test';
import { UserBuilder } from '@data/builders/UserBuilder';

/** Builders must always produce data the API accepts; these rules mirror the backend validation. */
test.describe('UserBuilder', { tag: '@unit' }, () => {
  test('defaults satisfy the registration rules', () => {
    const user = UserBuilder.aCustomer().build();

    expect(user.first_name.length).toBeLessThanOrEqual(40);
    expect(user.last_name.length).toBeLessThanOrEqual(20);
    expect(user.address.country).toBe('NL');
    expect(user.address.postal_code).toMatch(/^\d{4}\s?[A-Za-z]{2}$/); // PostcodeFormat NL
    expect(user.password).toMatch(/[a-z]/);
    expect(user.password).toMatch(/[A-Z]/);
    expect(user.password).toMatch(/\d/);
    expect(user.password).toMatch(/[^A-Za-z0-9]/);
    expect(user.password.length).toBeGreaterThanOrEqual(8);
  });

  test('age is always between 18 and 75', () => {
    const now = new Date();
    for (let i = 0; i < 50; i++) {
      const dob = new Date(UserBuilder.aCustomer().build().dob);
      const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      expect(age).toBeGreaterThan(18);
      expect(age).toBeLessThan(75);
    }
  });

  test('emails are unique across instances', () => {
    const emails = new Set(Array.from({ length: 200 }, () => UserBuilder.aCustomer().build().email));
    expect(emails.size).toBe(200);
  });

  test('overrides only touch what they name and build() returns an independent copy', () => {
    const builder = UserBuilder.aCustomer().withName('Ana', 'Gómez').withAddress({ city: 'Medellín' });
    const first = builder.build();
    first.address.city = 'mutated';

    const second = builder.build();
    expect(second.first_name).toBe('Ana');
    expect(second.address.city).toBe('Medellín');
    expect(second.address.country).toBe('NL');
  });
});
