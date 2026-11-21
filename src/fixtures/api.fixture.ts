import { test as base, type WorkerInfo } from '@playwright/test';
import path from 'node:path';
import { ApiClient } from '../api/ApiClient';
import { AuthSession } from '../api/AuthSession';
import { env, type Credentials } from '../config/env';
import { createCustomer } from '../data/factories/user.factory';

export interface ApiTestFixtures {
  /** API client authenticated as the worker's customer. */
  userApi: ApiClient;
  /** API client authenticated as the seeded admin. */
  adminApi: ApiClient;
}

export interface ApiWorkerFixtures {
  /** Anonymous API client, shared by the worker. */
  api: ApiClient;
  /** The customer owned by this worker. */
  customer: Credentials;
  /** API login + storageState for that customer. */
  authSession: AuthSession;
  /** API login + storageState for the admin. */
  adminSession: AuthSession;
}

function stateFile(workerInfo: WorkerInfo, role: string): string {
  return path.join(
    workerInfo.project.outputDir,
    '..',
    '.auth',
    `${workerInfo.project.name}-${role}-worker-${workerInfo.parallelIndex}.json`,
  );
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
      if (env.ownsData) {
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
    // Registration may be slow (the API checks the password against a breach-list service):
    // give it its own budget instead of eating the first test's timeout.
    { scope: 'worker', timeout: 60_000 },
  ],

  authSession: [
    async ({ api, customer }, use, workerInfo) => {
      await use(new AuthSession(api, customer, env.baseURL, stateFile(workerInfo, 'customer')));
    },
    { scope: 'worker' },
  ],

  adminSession: [
    async ({ api }, use, workerInfo) => {
      await use(new AuthSession(api, env.admin, env.baseURL, stateFile(workerInfo, 'admin')));
    },
    { scope: 'worker' },
  ],

  userApi: async ({ api, authSession }, use) => {
    await use(api.withToken(await authSession.getToken()));
  },

  adminApi: async ({ api, adminSession }, use) => {
    await use(api.withToken(await adminSession.getToken()));
  },
});
