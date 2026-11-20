import { test as base } from '@playwright/test';

/** Third-party hosts that add latency and noise but are not part of the system under test. */
const BLOCKED_HOSTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'doubleclick.net',
  'hotjar.com',
];

export interface NetworkFixtures {
  /** Auto fixture: aborts analytics/tracking requests for every test. */
  blockThirdParty: void;
}

export const networkTest = base.extend<NetworkFixtures>({
  blockThirdParty: [
    async ({ context }, use) => {
      await context.route(
        (url) => BLOCKED_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)),
        (route) => route.abort('blockedbyclient'),
      );
      await use();
    },
    { auto: true },
  ],
});
