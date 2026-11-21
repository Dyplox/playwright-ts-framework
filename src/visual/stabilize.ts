import type { Page } from '@playwright/test';

/**
 * Waits until the page is visually settled: web fonts loaded and every <img> in the
 * document decoded. Screenshots taken earlier differ run to run (fallback fonts, blank images).
 */
export async function waitForVisualStability(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    // Force lazy images to load so full-page screenshots are complete.
    for (const img of images) img.loading = 'eager';
    await Promise.all(
      images.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
      ),
    );
  });
}
