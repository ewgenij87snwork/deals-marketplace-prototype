import { test, expect, type Page } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

test.afterEach(async ({ page }) => cleanupWorkspace(page));

async function marketplaceFilterScope(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) > 600) return page;
  await page.getByRole('button', { name: 'Filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Marketplace filters' });
  await expect(sheet).toBeVisible();
  return sheet;
}

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
  const filters = await marketplaceFilterScope(page);
  await filters.locator('select[name="category"]').selectOption('EMI');
  await filters.locator('input[name="country"]').fill('LT');
  await filters.locator('select[name="businessStatus"]').selectOption('LICENSE_ONLY');
  await filters.getByRole('button', { name: 'Search', exact: true }).click();

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
  const filters = await marketplaceFilterScope(page);
  await expect(filters.locator('input[name="q"]')).toHaveValue('');
  await expect(filters.locator('input[name="country"]')).toHaveValue('');
});

test('Buyer filter controls follow browser Back together with URL and results', async ({
  page,
}) => {
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  const appliedFilters = await marketplaceFilterScope(page);
  await appliedFilters.locator('select[name="category"]').selectOption('EMI');
  await appliedFilters.locator('input[name="country"]').fill('LT');
  await appliedFilters.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('article.market-card')).toHaveCount(1);

  await page.goBack();

  await expect(page).toHaveURL(/\/buyer\/assets$/);
  const restoredFilters = await marketplaceFilterScope(page);
  await expect(restoredFilters.locator('select[name="category"]')).toHaveValue('');
  await expect(restoredFilters.locator('input[name="country"]')).toHaveValue('');
  await expect(page.locator('article.market-card')).toHaveCount(4);
});

test('Buyer price bounds constrain the Asset result set', async ({ page }) => {
  await choosePersona(page, 'Buyer');

  await page.goto('/buyer/assets?priceMin=3000000');

  await expect(page.locator('article.market-card')).toHaveCount(1);
  await expect(page.getByText('Irish RegTech Platform', { exact: true })).toBeVisible();
  const filters = await marketplaceFilterScope(page);
  await expect(filters.locator('input[name="priceMin"]')).toHaveValue('3000000');
});

test('Buyer text search includes the full Asset description promised by the UI', async ({
  page,
}) => {
  await choosePersona(page, 'Buyer');

  await page.goto('/buyer/assets?q=due-diligence-ready');

  await expect(page.locator('article.market-card')).toHaveCount(1);
  await expect(page.getByText('UK Payment Institution', { exact: true })).toBeVisible();
});

test('Buyer marketplace keeps two useful columns at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();

  const cards = page.locator('article.market-card');
  await expect(cards).toHaveCount(4);
  const boxes = await Promise.all([0, 1, 2].map((index) => cards.nth(index).boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
  expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height - 2);
});

test('Buyer mobile filters use a sheet and never widen the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only responsive contract.');
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();

  await page.getByRole('button', { name: 'Filters' }).click();
  const sheet = page.getByRole('dialog', { name: 'Marketplace filters' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('input[name="q"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('Buyer search treats SQL-like input as literal text', async ({ page }) => {
  await choosePersona(page, 'Buyer');
  const payload = `%_' OR 1=1 --`;

  await page.goto(`/buyer/assets?q=${encodeURIComponent(payload)}`);

  await expect(page.getByRole('heading', { name: 'Explore Assets' })).toBeVisible();
  const filters = await marketplaceFilterScope(page);
  await expect(filters.locator('input[name="q"]')).toHaveValue(payload);
  await expect(page.locator('article.market-card')).toHaveCount(0);
});
