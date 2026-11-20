import type { ApiClient } from '../../api/ApiClient';
import type { NewUser, User } from '../../api/types';
import { UserBuilder } from '../builders/UserBuilder';

export interface RegisteredUser {
  /** What the API returned (id, normalized fields). */
  profile: User;
  /** The credentials used to register, so tests can log in. */
  credentials: { email: string; password: string };
}

/**
 * Factories persist data through the API. Builders only describe it.
 * Keeping them separate lets unit-ish tests use builders without touching the backend.
 */
export async function createCustomer(
  api: ApiClient,
  customize: (builder: UserBuilder) => UserBuilder = (b) => b,
): Promise<RegisteredUser> {
  const user: NewUser = customize(UserBuilder.aCustomer()).build();
  const profile = await api.registerUser(user);
  return { profile, credentials: { email: user.email, password: user.password } };
}
