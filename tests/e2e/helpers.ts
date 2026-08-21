import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { expect, type Page } from '@playwright/test';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';

export type Persona = 'Buyer' | 'Seller' | 'Platform Manager';

export async function choosePersona(page: Page, persona: Persona) {
  await page.goto('/');
  await page.getByRole('button', { name: `Continue as ${persona}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Your marketplace desk' })).toBeVisible();
}

export async function cleanupWorkspace(page: Page) {
  const cookie = (await page.context().cookies()).find(({ name }) => name === 'n5deal_demo');
  const [encodedPayload, encodedSignature] = cookie?.value.split('.') ?? [];
  if (!encodedPayload || !encodedSignature) return;

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error('SESSION_SECRET is required for isolated E2E cleanup.');
  const actualSignature = Buffer.from(encodedSignature, 'base64url');
  const expectedSignature = createHmac('sha256', sessionSecret).update(encodedPayload).digest();
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  )
    return;

  let workspaceId: string | undefined;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      workspaceId?: unknown;
    };
    if (
      typeof payload.workspaceId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.workspaceId,
      )
    ) {
      workspaceId = payload.workspaceId;
    }
  } catch {
    return;
  }
  if (!workspaceId) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for isolated E2E cleanup.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await prisma.demoWorkspace.deleteMany({ where: { id: workspaceId } });
  } finally {
    await prisma.$disconnect();
    await page.context().clearCookies();
  }
}
