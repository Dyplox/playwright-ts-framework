import { test as base } from '@playwright/test';
import path from 'node:path';
import { ApiClient } from '../api/ApiClient';
import { AuthSession } from '../api/AuthSession';
import { env, type Credentials } from '../config/env';
import { createCustomer } from '../data/factories/user.factory';

export interface ApiTestFixtures {
  /** API client authenticated as the worker's customer. */
  userApi: ApiClient;
}

export interface ApiWorkerFixtures {
  /** Anonymous API client, shared by the worker. */
  api: ApiClient;
  /** The customer owned by this worker. */
  customer: Credentials;
  /** API login + storageState for that customer. */
  authSession: AuthSession;
}

export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  api: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      await use(new ApiClient(request, env.apiURL));
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  customer: [
    async ({ api }, use, workerInfo) => {
      if (env.canRegisterUsers) {
        // Full isolation: every worker owns a brand-new customer (cart, favorites, invoices).
        const { credentials } = await createCustomer(api);
        await use(credentials);
      } else {
        // Shared environments: rotate over the seeded accounts.
        const seeded = env.seededCustomers[workerInfo.parallelIndex % env.seededCustomers.length];
        if (!seeded) throw new Error('No seeded customers configured');
        await use(seeded);
      }
    },
    { scope: 'worker' },
  ],

  authSession: [
    async ({ api, customer }, use, workerInfo) => {
      const stateFile = path.join(
        workerInfo.project.outputDir,
        '..',
        '.auth',
        `${workerInfo.project.name}-worker-${workerInfo.parallelIndex}.json`,
      );
      await use(new AuthSession(api, customer, env.baseURL, stateFile));
    },
    { scope: 'worker' },
  ],

  userApi: async ({ api, authSession }, use) => {
    await use(api.withToken(await authSession.getToken()));
  },
});
