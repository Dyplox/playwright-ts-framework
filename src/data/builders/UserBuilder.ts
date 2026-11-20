import { faker } from '@faker-js/faker';
import type { Address, NewUser } from '../../api/types';

/**
 * Fluent builder for customers. Defaults are always valid against the Toolshop rules:
 * - age between 18 and 75
 * - postal code matching the country format (NL: "1234 AB")
 * - password with upper/lower case, digits and symbols
 * Tests only override what matters for the scenario.
 */
export class UserBuilder {
  private user: NewUser;

  constructor() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName().slice(0, 20);
    this.user = {
      first_name: firstName,
      last_name: lastName,
      address: UserBuilder.defaultAddress(),
      phone: faker.string.numeric(10),
      dob: faker.date.birthdate({ mode: 'age', min: 20, max: 70 }).toISOString().slice(0, 10),
      email: UserBuilder.uniqueEmail(firstName),
      password: UserBuilder.strongPassword(),
    };
  }

  static aCustomer(): UserBuilder {
    return new UserBuilder();
  }

  withName(firstName: string, lastName: string): this {
    this.user.first_name = firstName;
    this.user.last_name = lastName;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withPassword(password: string): this {
    this.user.password = password;
    return this;
  }

  withAddress(address: Partial<Address>): this {
    this.user.address = { ...this.user.address, ...address };
    return this;
  }

  build(): NewUser {
    return structuredClone(this.user);
  }

  private static defaultAddress(): Address {
    return {
      street: faker.location.street().slice(0, 70),
      house_number: String(faker.number.int({ min: 1, max: 999 })),
      city: faker.location.city().slice(0, 40),
      state: faker.location.state().slice(0, 40),
      country: 'NL',
      postal_code: `${faker.string.numeric({ length: 4, allowLeadingZeros: false })} ${faker.string.alpha({ length: 2, casing: 'upper' })}`,
    };
  }

  private static uniqueEmail(firstName: string): string {
    const slug = firstName.toLowerCase().replace(/[^a-z]/g, '') || 'user';
    return `pw.${slug}.${Date.now()}.${faker.string.alphanumeric(6).toLowerCase()}@example.com`;
  }

  private static strongPassword(): string {
    // Random enough to never appear in breach lists (the API checks "uncompromised").
    return `Pw!${faker.string.alphanumeric(12)}9a#`;
  }
}
