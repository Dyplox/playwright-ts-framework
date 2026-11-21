import { test, expect } from '@fixtures';
import { env } from '@config/env';

const LANGUAGES = ['de', 'el', 'en', 'es', 'fr', 'nl', 'tr'] as const;

interface Translations {
  header: { menu: Record<'home' | 'contact' | 'sign-in', string> };
}

/**
 * Data-driven over every language the app ships. Expected labels come from the app's own
 * translation files (/assets/i18n/<lang>.json), so the test never hard-codes copy.
 */
test.describe('Internationalisation', { tag: ['@e2e', '@regression'] }, () => {
  for (const lang of LANGUAGES) {
    test(`switching to ${lang.toUpperCase()} translates the navigation and persists`, async ({
      page,
      request,
      catalogPage,
    }) => {
      const response = await request.get(`${env.baseURL}/assets/i18n/${lang}.json`);
      expect(response.ok(), `translation file for ${lang}`).toBe(true);
      const { menu } = ((await response.json()) as Translations).header;

      await catalogPage.goto();
      await page.getByTestId('language-select').click();
      await page.getByTestId(`lang-${lang}`).click();

      const { header } = catalogPage;
      await expect(header.homeLink).toHaveText(menu.home);
      await expect(page.getByTestId('nav-contact')).toHaveText(menu.contact);
      await expect(header.signIn).toHaveText(menu['sign-in']);

      await page.reload();
      await expect(header.homeLink, 'language survives a reload').toHaveText(menu.home);
    });
  }
});
