import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Keyboard helpers for checks axe can't do: tab order, reachability and visible focus
 * (WCAG 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible).
 */

/** Presses Tab until `target` is focused; fails if it takes more than `maxPresses`. */
export async function tabTo(page: Page, target: Locator, maxPresses = 15): Promise<number> {
  for (let presses = 1; presses <= maxPresses; presses++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return presses;
  }
  throw new Error(`Element not reachable with ${maxPresses} Tab presses: ${target.toString()}`);
}

/** True when the focused element paints an outline or a non-transparent focus ring. */
function focusIndicatorOf(el: Element): boolean {
  const style = getComputedStyle(el);
  const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  const ring =
    style.boxShadow !== 'none' &&
    !/rgba\([^)]*,\s*0\)\s/.test(`${style.boxShadow} `) &&
    /\d+px/.test(style.boxShadow);
  return outline || ring;
}

/** Waits for focus-ring transitions to settle and asserts a visible focus indicator. */
export async function expectVisibleFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  await expect
    .poll(() => target.evaluate(focusIndicatorOf), {
      message: `visible focus indicator on ${target.toString()}`,
    })
    .toBe(true);
}
