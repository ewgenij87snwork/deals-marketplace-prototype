import { test, expect } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

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
  await expect(sellerRows).toHaveCount(2);
  const firstSeller = sellerRows.filter({ hasText: 'Atlas Deal Advisory' });
  await expect(firstSeller).toContainText('SELLER');
  await expect(firstSeller.getByRole('button', { name: 'Review Remove' })).toBeVisible();

  await firstSeller.getByRole('button', { name: 'Review Suspend' }).click();
  const suspendDialog = page.getByRole('dialog', { name: 'Suspend participant' });
  await expect(suspendDialog).toBeVisible();
  await expect(suspendDialog).toContainText('Assets will be hidden from Buyers');
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
