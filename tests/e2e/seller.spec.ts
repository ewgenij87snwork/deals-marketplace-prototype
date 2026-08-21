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
  const regulatoryDetails = page.locator('details').filter({
    has: page.getByText('Regulatory & team details', { exact: true }),
  });
  await regulatoryDetails.locator('summary').click();
  await expect(regulatoryDetails).toHaveAttribute('open', '');
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
  await expect(page).toHaveURL(/asset=/);
  await expect(page.locator('select[name="asset"] option:checked')).toHaveText(title);
  await expect(page.getByRole('progressbar')).toHaveCount(20);

  const firstBuyer = page.locator('.market-card').first();
  await firstBuyer.getByRole('button', { name: 'Contact Buyer', exact: true }).click();
  const subject = 'Seller contextual inquiry';
  await firstBuyer.locator('input[name="subject"]').fill(subject);
  await firstBuyer.getByRole('button', { name: 'Send inquiry', exact: true }).click();
  await expect(firstBuyer.getByRole('status')).toHaveText('Inquiry sent successfully.');
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

  const card = page.locator('.market-card').first();
  const summary = card.getByRole('button', { name: 'Contact Buyer', exact: true });
  const box = await summary.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await summary.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');

  await summary.click({ position: { x: box!.width - 8, y: box!.height / 2 } });
  await expect(card.locator('input[name="subject"]')).toBeVisible();
});

test('Seller Asset context stays selected after live matching results arrive', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Find Buyers', exact: true }).click();

  const asset = page.locator('select[name="asset"]');
  const current = await asset.locator('option:checked').innerText();
  const target =
    current === 'Irish RegTech Platform' ? 'UK Payment Institution' : 'Irish RegTech Platform';
  await asset.selectOption({ label: target });

  await expect(page).toHaveURL(/asset=/);
  await expect(page.locator('.match-context strong')).toHaveText(target);
  await expect(asset.locator('option:checked')).toHaveText(target);
});

test('Seller sidebar controls stay in the viewport while the long publish form scrolls', async ({
  page,
}) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Publish Asset', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Publish an Asset', exact: true })).toBeVisible();

  const sidebar = page.locator('.sidebar');
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(Math.abs(sidebarBox!.y)).toBeLessThan(2);
  expect(sidebarBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(page.getByRole('link', { name: 'Switch persona' })).toBeInViewport();
});

test('Seller Buyer contacts behave as a single-open accordion', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Find Buyers', exact: true }).click();

  const cards = page.locator('.market-card');
  const firstDetails = cards.nth(0).getByRole('button', { name: 'Contact Buyer', exact: true });
  const secondDetails = cards.nth(1).getByRole('button', { name: 'Contact Buyer', exact: true });

  await firstDetails.click();
  await expect(cards.nth(0).locator('input[name="subject"]')).toBeVisible();
  await secondDetails.click();

  await expect(cards.nth(0).locator('input[name="subject"]')).toBeHidden();
  await expect(cards.nth(1).locator('input[name="subject"]')).toBeVisible();
});

test('opening one Buyer contact keeps closed cards compact', async ({ page }) => {
  await choosePersona(page, 'Seller');
  await page.getByRole('link', { name: 'Find Buyers', exact: true }).click();

  const cards = page.locator('.market-card');
  const closedCard = cards.nth(0);
  const openCard = cards.nth(1);
  await openCard.getByRole('button', { name: 'Contact Buyer', exact: true }).click();

  const closedHeight = await closedCard.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  const openHeight = await openCard.evaluate((element) => element.getBoundingClientRect().height);
  expect(openHeight - closedHeight).toBeGreaterThan(200);
});

test("Seller cannot inspect another Seller's Asset by guessed URL", async ({ page }) => {
  await choosePersona(page, 'Buyer');
  await page.getByRole('link', { name: 'Marketplace', exact: true }).click();
  await page.goto('/buyer/assets?q=Lithuanian%20EMI%20Licence');
  const foreignCard = page.locator('.market-card').filter({ hasText: 'Lithuanian EMI Licence' });
  const foreignAssetUrl = await foreignCard.getAttribute('href');
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
