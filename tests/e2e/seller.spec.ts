import { test, expect } from '@playwright/test';
import { choosePersona, cleanupWorkspace } from './helpers';

test.afterEach(async ({ page }) => cleanupWorkspace(page));

test('Seller publishes an Asset and uses it for Buyer matching and contact', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Publish Asset', exact: true }).first().click();
  await expect(page).toHaveURL(/\/seller\/publish$/);

  const title = 'Reviewer Baltic EMI';
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="category"]').selectOption('EMI');
  await page.locator('input[name="countryCode"]').fill('LT');
  await page.locator('input[name="askingPriceEur"]').fill('1250000');
  await page.locator('select[name="businessStatus"]').selectOption('ACTIVE');
  await page.locator('input[name="licenseType"]').fill('EMI');
  await page.locator('input[name="regulator"]').fill('Bank of Lithuania');
  await page.locator('input[name="employeeCount"]').fill('12');
  await page
    .locator('textarea[name="summary"]')
    .fill('A fictional regulated EMI used for the reviewer journey and matching proof.');
  await page
    .locator('textarea[name="description"]')
    .fill('This fictional listing verifies persistence, Seller matching, and contextual contact.');
  await page.locator('input[name="highlights"]').fill('Regulated, EEA, operating team');
  await page.getByRole('button', { name: 'Publish Asset', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved successfully.');

  await page.getByRole('link', { name: 'My Assets', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Find Buyers', exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/buyers$/);
  await page.locator('select[name="asset"]').selectOption({ label: title });
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page).toHaveURL(/asset=/);
  await expect(page.locator('select[name="asset"] option:checked')).toHaveText(title);
  await expect(page.getByText('Smart Match', { exact: false })).toHaveCount(3);

  const firstBuyer = page.locator('article.market-card').first();
  await firstBuyer.locator('summary').click();
  const subject = 'Seller contextual inquiry';
  await firstBuyer.locator('input[name="subject"]').fill(subject);
  await firstBuyer.getByRole('button', { name: 'Send inquiry', exact: true }).click();
  await expect(firstBuyer.getByRole('status')).toHaveText('Saved successfully.');
  await page.getByRole('link', { name: 'Inquiries', exact: true }).click();
  const contact = page.locator('article.contact-card').filter({ hasText: subject });
  await expect(contact).toHaveCount(1);
  await expect(contact).toContainText(title);
});

test('Seller contact disclosure exposes the whole padded row as a click target', async ({
  page,
}) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Find Buyers', exact: true }).click();

  const card = page.locator('article.market-card').first();
  const details = card.locator('details');
  const summary = details.locator('summary');
  const box = await summary.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await summary.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');

  await summary.click({ position: { x: box!.width - 8, y: box!.height / 2 } });

  await expect(details).toHaveAttribute('open', '');
});

test("Seller cannot inspect another Seller's Asset by guessed URL", async ({ page }) => {
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  const foreignCard = page
    .locator('article.market-card')
    .filter({ hasText: 'Lithuanian EMI Licence' });
  const foreignAssetUrl = await foreignCard
    .getByRole('link', { name: /Inspect opportunity/i })
    .getAttribute('href');
  expect(foreignAssetUrl).toBeTruthy();

  await choosePersona(page, 'Seller');
  await page.goto(foreignAssetUrl!);
  await expect(page.getByRole('heading', { name: 'Not found', exact: true })).toBeVisible();
});

test('Seller canonicalizes malformed Buyer filters and Asset context', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.goto(`/seller/buyers?q=${'x'.repeat(121)}&country=INVALID&asset=not-a-uuid`);

  await expect(page).toHaveURL(/\/seller\/buyers$/);
  await expect(page.locator('input[name="q"]')).toHaveValue('');
  await expect(page.locator('input[name="country"]')).toHaveValue('');
  await expect(page.locator('select[name="asset"]')).not.toHaveValue('');
});

test('Seller listing text is rendered literally and cannot execute markup', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.goto('/seller/publish');
  const title = '<img src=x onerror="window.__n5_pwned=1">';

  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="askingPriceEur"]').fill('900000');
  await page
    .locator('textarea[name="summary"]')
    .fill('A fictional literal-rendering test listing with sufficient summary context.');
  await page
    .locator('textarea[name="description"]')
    .fill(
      'This isolated fictional listing proves that reviewer supplied markup stays inert when it is read back from the database.',
    );
  await page.locator('input[name="highlights"]').fill('Fictional, isolated');
  await page.getByRole('button', { name: 'Publish Asset', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved successfully.');

  await page.goto('/seller/assets');
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.has(window, '__n5_pwned'))).toBe(false);
});
