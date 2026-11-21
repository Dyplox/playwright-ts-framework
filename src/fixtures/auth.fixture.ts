import { apiTest } from './api.fixture';

export type Role = 'anonymous' | 'customer' | 'admin';

export interface AuthOptions {
  /**
   * Who the browser is signed in as when the test starts, without touching the login form.
   * Usage: `test.use({ role: 'customer' })` at file or describe level. Default: anonymous.
   */
  role: Role;
}

export const authTest = apiTest.extend<AuthOptions>({
  role: ['anonymous', { option: true }],

  // Built-in `storageState` option, resolved lazily from the worker's API sessions.
  storageState: async ({ role, authSession, adminSession, storageState }, use) => {
    const sessions = { customer: authSession, admin: adminSession } as const;
    await use(role === 'anonymous' ? storageState : await sessions[role].storageStatePath());
  },
});
