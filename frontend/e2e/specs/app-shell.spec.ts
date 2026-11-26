import { expect, test } from '../fixtures/test';
import { AppShellPage } from '../pages/app-shell.page';

test.describe('The app shell', () => {
  test('@critical opening / shows the shell titled "Around the World" on the light sky blue background', async ({
    page,
  }) => {
    // Given the game is served
    const shell = new AppShellPage(page);

    // When a child opens /
    await shell.open();

    // Then the page is titled "Around the World"
    expect(await shell.title()).toBe('Around the World');
    // And the page sits on the light sky blue canvas of the design system
    expect(await shell.token('--color-bg-canvas')).toBe('#dff3ff');
    expect(await shell.background()).toBe('rgb(223, 243, 255)');
  });

  test('the first Tab reaches "Skip to the game"', async ({ page }) => {
    // Given the shell is open
    const shell = new AppShellPage(page);
    await shell.open();

    // When the child presses Tab
    await shell.pressTab();

    // Then the skip link is focused and says where it goes
    await expect(shell.skipLink).toBeFocused();
    await expect(shell.skipLink).toHaveText('Skip to the game');
    await expect(shell.skipLink).toHaveAttribute('href', '#main');
  });
});
