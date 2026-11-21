import { test as base, expect } from '@playwright/test';
import { auditA11y, formatViolations, type AuditOptions, type A11yReport } from '../a11y/audit';

export interface A11yFixtures {
  /**
   * Scans the current page against WCAG 2.1 AA and fails on any violation that is not a
   * documented exception (src/a11y/exceptions.ts). Returns the report for extra checks.
   */
  expectAccessible: (options?: AuditOptions) => Promise<A11yReport>;
}

export const a11yTest = base.extend<A11yFixtures>({
  expectAccessible: async ({ page }, use, testInfo) => {
    await use(async (options) => {
      const report = await auditA11y(page, testInfo, options);
      expect(report.violations, `WCAG 2.1 AA violations:\n${formatViolations(report.violations)}`).toEqual(
        [],
      );
      return report;
    });
  },
});
