import { expect, test } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

test.afterEach(async ({ page }) => cleanupWorkspace(page));

test('anonymous protected routes recover at the persona chooser instead of returning 500', async ({
  page,
}) => {
  await page.goto('/manager/participants');

  await expect(page).toHaveURL(/\/\?notice=session$/);
  await expect(
    page.getByRole('heading', { name: 'A focused marketplace for M&A opportunities.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Your demo session expired or is no longer available.'),
  ).toBeVisible();
});

test('wrong-role protected routes return an active persona to its dashboard', async ({ page }) => {
  await choosePersona(page, 'Buyer');

  await page.goto('/manager/participants');

  await expect(page).toHaveURL(/\/dashboard\?notice=role$/);
  await expect(page.getByRole('heading', { name: 'Your marketplace desk' })).toBeVisible();
  await expect(page.getByText('That page is not available for the active persona.')).toBeVisible();
});

test('reviewer can reset only the current demo workspace and start cleanly', async ({ page }) => {
  await choosePersona(page, 'Buyer');

  await page.getByRole('button', { name: 'Reset demo workspace' }).click();

  await expect(page).toHaveURL(/\/\?notice=reset$/);
  await expect(page.getByRole('button', { name: 'Continue as Buyer', exact: true })).toBeVisible();
  await expect(page.getByText('The previous demo workspace was reset.')).toBeVisible();
});

test('a participant suspended during an active session cannot keep using the dashboard', async ({
  page,
}) => {
  await choosePersona(page, 'Seller');
  const sellerCookie = (await page.context().cookies()).find(({ name }) => name === 'deals_demo');
  expect(sellerCookie).toBeDefined();

  await choosePersona(page, 'Platform Manager');
  await page.getByRole('link', { name: 'Participants', exact: true }).click();
  const sellerRow = page.locator('tbody tr').filter({ hasText: 'Atlas Deal Advisory' });
  await sellerRow.getByRole('button', { name: 'Review Suspend' }).click();
  await page
    .getByRole('dialog', { name: 'Suspend participant' })
    .getByRole('button', { name: 'Confirm Suspend' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Saved successfully.');
  await page.goto('/manager/participants?role=SELLER');
  await expect(sellerRow).toContainText('SUSPENDED');

  await page.context().addCookies([sellerCookie!]);
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/\?notice=suspended$/);
  await expect(page.getByText('This demo participant is suspended.')).toBeVisible();
});
