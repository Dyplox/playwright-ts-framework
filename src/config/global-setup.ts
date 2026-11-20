import { request, type FullConfig } from '@playwright/test';
import { env } from './env';

/**
 * Fail fast with a clear message when the application under test is not reachable,
 * instead of letting every test time out on its own.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const context = await request.newContext();
  const targets = [
    { name: 'API', url: `${env.apiURL}/status` },
    { name: 'UI', url: env.baseURL },
  ];

  try {
    for (const target of targets) {
      const ok = await waitUntilUp(context, target.url);
      if (!ok) {
        throw new Error(
          `[${env.name}] ${target.name} is not reachable at ${target.url}. ` +
            'Start Toolshop locally (see README > "Run Toolshop locally") or run with TEST_ENV=public.',
        );
      }
    }
  } finally {
    await context.dispose();
  }
}

async function waitUntilUp(
  context: Awaited<ReturnType<typeof request.newContext>>,
  url: string,
  attempts = 10,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await context.get(url, { timeout: 5_000 });
      if (response.ok()) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
}
