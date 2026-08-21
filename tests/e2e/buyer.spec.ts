import { test, expect } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

test.afterEach(async ({ page }) => cleanupWorkspace(page));

test('Buyer mandate persists and URL filters Assets', async ({ page }) => {
  await choosePersona(page, 'Buyer');

  await page.getByRole('link', { name: 'Mandate', exact: true }).click();
  await expect(page).toHaveURL(/\/buyer\/profile$/);
  await page
    .locator('textarea[name="investmentThesis"]')
    .fill('Acquire a regulated EMI in Lithuania with an operating team and clear licence scope.');
  await page.locator('input[name="budgetMinEur"]').fill('500000');
  await page.locator('input[name="budgetMaxEur"]').fill('1500000');
  await page.locator('input[name="targetCountries"]').fill('LT');
  await page.locator('input[name="targetCategories"]').fill('EMI');
  await page.locator('input[name="targetLicenseTypes"]').fill('EMI');
  await page.locator('input[name="targetBusinessStatuses"]').fill('LICENSE_ONLY');
  await page.locator('input[name="minEmployees"]').fill('1');
  await page.locator('input[name="maxEmployees"]').fill('10');
  await page.getByRole('button', { name: 'Save mandate', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved successfully.');

  await page.reload();
  await expect(page.locator('input[name="maxEmployees"]')).toHaveValue('10');

  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  await expect(page).toHaveURL(/\/buyer\/assets$/);
  await page.locator('select[name="category"]').selectOption('EMI');
  await page.locator('input[name="country"]').fill('LT');
  await page.locator('select[name="businessStatus"]').selectOption('LICENSE_ONLY');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page).toHaveURL(/category=EMI/);
  await expect(page).toHaveURL(/country=LT/);
  const cards = page.locator('article.market-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Lithuanian EMI Licence');
  await expect(cards.first()).toContainText('Smart Match');
});

test('Buyer contact retry remains one persisted inquiry', async ({ page }) => {
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  await page
    .getByRole('link', { name: /Inspect opportunity/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/assets\//);

  const subject = 'Idempotent production inquiry';
  await page.locator('input[name="subject"]').fill(subject);
  await page
    .locator('textarea[name="message"]')
    .fill('Please share the fictional diligence steps for this opportunity.');
  const send = page.getByRole('button', { name: 'Send inquiry', exact: true });
  await send.click();
  await expect(page.getByRole('status')).toHaveText('Saved successfully.');
  const retryResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/assets/'),
  );
  await send.click();
  await retryResponse;

  await page.getByRole('link', { name: 'Inquiries', exact: true }).click();
  const matchingContacts = page.locator('article.contact-card').filter({ hasText: subject });
  await expect(matchingContacts).toHaveCount(1);
  await page.reload();
  await expect(page.locator('article.contact-card').filter({ hasText: subject })).toHaveCount(1);
});

test('Buyer rejects malformed marketplace filters instead of reflecting them', async ({ page }) => {
  await choosePersona(page, 'Buyer');
  await page.goto(`/buyer/assets?q=${'x'.repeat(121)}&country=INVALID`);

  await expect(page).toHaveURL(/\/buyer\/assets$/);
  await expect(page.locator('input[name="q"]')).toHaveValue('');
  await expect(page.locator('input[name="country"]')).toHaveValue('');
});
