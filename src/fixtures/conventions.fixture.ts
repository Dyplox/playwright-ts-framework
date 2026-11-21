import { test as base } from '@playwright/test';

/** Tags used to slice the suite in CI and locally. Every test must carry at least one. */
export const KNOWN_TAGS = [
  '@smoke',
  '@e2e',
  '@regression',
  '@mock',
  '@a11y',
  '@visual',
  '@api',
  '@contract',
  '@unit',
];

export interface ConventionFixtures {
  /** Auto fixture: fails fast when a test breaks the suite conventions. */
  enforceConventions: void;
}

export const conventionsTest = base.extend<ConventionFixtures>({
  enforceConventions: [
    async ({}, use, testInfo) => {
      if (testInfo.tags.length === 0) {
        throw new Error(
          `"${testInfo.title}" has no tag. Add one of ${KNOWN_TAGS.join(', ')} so it can be selected with --grep.`,
        );
      }
      const unknown = testInfo.tags.filter((t) => !KNOWN_TAGS.includes(t));
      if (unknown.length > 0) {
        throw new Error(`Unknown tag(s) ${unknown.join(', ')}. Register them in KNOWN_TAGS first.`);
      }
      await use();
    },
    { auto: true },
  ],
});
