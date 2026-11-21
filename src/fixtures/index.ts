import { mergeTests } from '@playwright/test';
import { a11yTest } from './a11y.fixture';
import { authTest } from './auth.fixture';
import { conventionsTest } from './conventions.fixture';
import { networkTest } from './network.fixture';
import { pagesTest } from './pages.fixture';

/**
 * Single entry point for specs: `import { test, expect } from '@fixtures'`.
 * Fixtures are composed with mergeTests (no inheritance chains between page objects).
 */
export const test = mergeTests(authTest, pagesTest, networkTest, a11yTest, conventionsTest);
export { expect } from '@playwright/test';
