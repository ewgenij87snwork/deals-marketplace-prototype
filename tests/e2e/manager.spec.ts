import { test, expect } from '@playwright/test';
import { choosePersona, cleanupWorkspace, deleteWorkspaceAssets } from './helpers';

test.afterEach(async ({ page }) => cleanupWorkspace(page));

test('Manager filters, previews suspension consequence, and restores the Seller', async ({
  page,
}) => {
  await choosePersona(page, 'Platform Manager');
  await page.getByRole('link', { name: 'Participants', exact: true }).click();
  await expect(page).toHaveURL(/\/manager\/participants$/);
  await page.locator('select[name="role"]').selectOption('SELLER');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/role=SELLER/);

  const sellerRows = page.locator('tbody tr');
  await expect(sellerRows).toHaveCount(8);
  const firstSeller = sellerRows.filter({ hasText: 'Atlas Deal Advisory' });
  await expect(firstSeller).toContainText('SELLER');
  await expect(firstSeller.getByRole('button', { name: 'Review Remove' })).toBeVisible();

  const reviewSuspend = firstSeller.getByRole('button', { name: 'Review Suspend' });
  await reviewSuspend.focus();
  await page.keyboard.press('Enter');
  const suspendDialog = page.getByRole('dialog', { name: 'Suspend participant' });
  await expect(suspendDialog).toBeVisible();
  await expect(suspendDialog).toContainText('Assets will be hidden from Buyers');
  await page.keyboard.press('Escape');
  await expect(suspendDialog).toBeHidden();
  await expect(reviewSuspend).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(suspendDialog).toBeVisible();
  await suspendDialog.getByRole('button', { name: 'Confirm Suspend' }).click();
  await expect(firstSeller).toContainText('SUSPENDED');

  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  await expect(page.getByText('UK Payment Institution', { exact: true })).toHaveCount(0);

  await choosePersona(page, 'Platform Manager');
  await page.getByRole('link', { name: 'Participants', exact: true }).click();
  await page.locator('select[name="status"]').selectOption('SUSPENDED');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const suspendedRow = page.locator('tbody tr').first();
  await expect(suspendedRow).toContainText('SUSPENDED');
  await suspendedRow.getByRole('button', { name: 'Review Restore' }).click();
  const restoreDialog = page.getByRole('dialog', { name: 'Restore participant' });
  await expect(restoreDialog).toBeVisible();
  await restoreDialog.getByRole('button', { name: 'Confirm Restore' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('Manager rejects malformed participant filters instead of reflecting them', async ({
  page,
}) => {
  await choosePersona(page, 'Platform Manager');
  await page.goto(`/manager/participants?q=${'x'.repeat(121)}&country=INVALID`);

  await expect(page).toHaveURL(/\/manager\/participants$/);
  await expect(page.locator('input[name="q"]')).toHaveValue('');
  await expect(page.locator('input[name="country"]')).toHaveValue('');
});

test('Manager cannot expose platform managers through a forged role filter', async ({ page }) => {
  await choosePersona(page, 'Platform Manager');
  await page.goto('/manager/participants?role=PLATFORM_MANAGER');

  await expect(page).toHaveURL(/\/manager\/participants$/);
  await expect(page.locator('tbody')).not.toContainText('PLATFORM_MANAGER');
});

test('Manager searches and filters the Asset directory through canonical URL state', async ({
  page,
}) => {
  await choosePersona(page, 'Platform Manager');

  await page.goto('/manager/assets?q=UK&category=PAYMENT&country=GB&sellerStatus=ACTIVE');

  await expect(page.locator('input[name="q"]')).toHaveValue('UK');
  await expect(page.locator('select[name="category"]')).toHaveValue('PAYMENT');
  await expect(page.locator('input[name="country"]')).toHaveValue('GB');
  await expect(page.locator('select[name="sellerStatus"]')).toHaveValue('ACTIVE');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr').first()).toContainText('UK Payment Institution');
});

test('Manager Asset filter controls follow browser Back with the result table', async ({
  page,
}) => {
  await choosePersona(page, 'Platform Manager');
  await page.goto('/manager/assets');
  await page.locator('input[name="q"]').fill('UK');
  await page.locator('select[name="category"]').selectOption('PAYMENT');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await page.goBack();

  await expect(page).toHaveURL(/\/manager\/assets$/);
  await expect(page.locator('input[name="q"]')).toHaveValue('');
  await expect(page.locator('select[name="category"]')).toHaveValue('');
  await expect(page.locator('tbody tr')).toHaveCount(12);
});

test('Manager participant records remain fully actionable at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await choosePersona(page, 'Platform Manager');
  await page.getByRole('link', { name: 'Participants', exact: true }).click();

  const table = page.locator('.table-wrap');
  const action = table.getByRole('button', { name: 'Review Suspend' }).first();
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  expect(await table.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('Seller and Manager explain a truly empty Asset inventory', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await deleteWorkspaceAssets(page);
  await page.goto('/seller/assets');

  await expect(page.getByText('No Assets published yet.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Publish your first Asset' })).toBeVisible();

  await choosePersona(page, 'Platform Manager');
  await page.goto('/manager/assets');
  await expect(
    page.getByText('No Assets are currently listed in this demo workspace.'),
  ).toBeVisible();
});
