import { expect, test, type Locator } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

async function expectUnifiedSignature(signature: Locator) {
  await expect(signature).toBeVisible();
  await expect(signature).toHaveCSS('display', 'flex');
  await expect(signature).toHaveCSS('align-items', 'center');

  const nameBox = await signature.locator('.creator-signature__name').boundingBox();
  const githubBox = await signature.getByRole('link', { name: /GitHub/ }).boundingBox();
  expect(nameBox).not.toBeNull();
  expect(githubBox).not.toBeNull();

  const gap = githubBox!.x - (nameBox!.x + nameBox!.width);
  const centerOffset = Math.abs(
    nameBox!.y + nameBox!.height / 2 - (githubBox!.y + githubBox!.height / 2),
  );

  expect(gap).toBeGreaterThanOrEqual(4);
  expect(gap).toBeLessThanOrEqual(16);
  expect(centerOffset).toBeLessThanOrEqual(1);
}

test.afterEach(async ({ page }) => cleanupWorkspace(page));

test('creator identity remains one compact unit on every shell layout', async ({ page }) => {
  await page.goto('/');
  await expectUnifiedSignature(page.locator('.creator-signature--welcome'));

  await choosePersona(page, 'Seller');
  await expectUnifiedSignature(page.locator('.creator-signature--sidebar'));

  await page.setViewportSize({ width: 390, height: 844 });
  await expectUnifiedSignature(page.locator('.creator-signature--mobile'));
});
