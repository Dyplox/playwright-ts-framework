import type { User } from '../api/types';

export interface CompleteAddress {
  street: string;
  houseNumber: string | null;
  city: string;
  country: string;
  postalCode: string;
}

/**
 * The API types every address field as nullable (seeded users have partial addresses).
 * Customers created by UserBuilder always have one: fail clearly if that assumption breaks.
 */
export function requireAddress(user: User): CompleteAddress {
  const { street, house_number, city, country, postal_code } = user.address;
  if (!street || !city || !country || !postal_code) {
    throw new Error(`User ${user.email} has an incomplete address: ${JSON.stringify(user.address)}`);
  }
  return { street, houseNumber: house_number ?? null, city, country, postalCode: postal_code };
}
