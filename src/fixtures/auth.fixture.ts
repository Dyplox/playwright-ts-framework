import { apiTest } from './api.fixture';

export interface AuthOptions {
  /**
   * Start the test already signed in as the worker's customer.
   * Usage: `test.use({ authenticated: true })` at file or describe level.
   */
  authenticated: boolean;
}

export const authTest = apiTest.extend<AuthOptions>({
  authenticated: [false, { option: true }],

  // Built-in `storageState` option, resolved lazily from the worker's API session.
  storageState: async ({ authenticated, authSession, storageState }, use) => {
    await use(authenticated ? await authSession.storageStatePath() : storageState);
  },
});
