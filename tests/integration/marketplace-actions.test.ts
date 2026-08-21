// @vitest-environment node

import 'dotenv/config';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Principal } from '@/server/policy/authorization';

const mocks = vi.hoisted(() => ({
  principal: null as Principal | null,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/session/signed-session', () => ({
  requirePrincipal: vi.fn(async () => {
    if (!mocks.principal) throw new Error('Test principal was not configured.');
    return mocks.principal;
  }),
}));

import {
  createContactAction,
  moderateParticipantAction,
  previewModerationAction,
} from '@/server/actions/marketplace';
import { prisma } from '@/server/db/prisma';

type Fixture = {
  workspaceId: string;
  buyer: Principal;
  seller: Principal;
  manager: Principal;
  assetId: string;
};

let fixture: Fixture | null = null;

async function createFixture(): Promise<Fixture> {
  const workspace = await prisma.demoWorkspace.create({
    data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const [buyer, seller, manager] = await Promise.all([
    prisma.user.create({
      data: {
        workspaceId: workspace.id,
        role: 'BUYER',
        name: 'Concurrency Buyer',
        organization: 'Concurrency Buyer Org',
        email: 'buyer@example.test',
        normalizedEmail: 'buyer@example.test',
        countryCode: 'GB',
      },
    }),
    prisma.user.create({
      data: {
        workspaceId: workspace.id,
        role: 'SELLER',
        name: 'Concurrency Seller',
        organization: 'Concurrency Seller Org',
        email: 'seller@example.test',
        normalizedEmail: 'seller@example.test',
        countryCode: 'LT',
      },
    }),
    prisma.user.create({
      data: {
        workspaceId: workspace.id,
        role: 'PLATFORM_MANAGER',
        name: 'Concurrency Manager',
        organization: 'Concurrency Manager Org',
        email: 'manager@example.test',
        normalizedEmail: 'manager@example.test',
        countryCode: 'PL',
      },
    }),
  ]);
  const asset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      sellerId: seller.id,
      title: 'Concurrency Test Asset',
      normalizedTitle: 'concurrency test asset',
      summary: 'A fictional Asset used only to verify concurrent marketplace actions.',
      description:
        'This fictional Asset belongs to an isolated integration-test workspace and is deleted after each test.',
      category: 'EMI',
      countryCode: 'LT',
      businessStatus: 'ACTIVE',
      askingPriceEur: 1_000_000,
      highlights: ['Fictional', 'Isolated'],
    },
  });

  const principal = (user: typeof buyer): Principal => ({
    workspaceId: user.workspaceId,
    userId: user.id,
    role: user.role,
    status: user.status,
  });

  return {
    workspaceId: workspace.id,
    buyer: principal(buyer),
    seller: principal(seller),
    manager: principal(manager),
    assetId: asset.id,
  };
}

describe('marketplace action concurrency', () => {
  beforeEach(async () => {
    fixture = await createFixture();
  });

  afterEach(async () => {
    mocks.principal = null;
    if (fixture) {
      await prisma.demoWorkspace.deleteMany({ where: { id: fixture.workspaceId } });
      fixture = null;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns one persisted Contact for concurrent retries with one idempotency key', async () => {
    mocks.principal = fixture!.buyer;
    const input = {
      recipientId: fixture!.seller.userId,
      assetId: fixture!.assetId,
      subject: 'Concurrent inquiry retry',
      message: 'Please share the fictional diligence steps for this isolated test opportunity.',
      idempotencyKey: crypto.randomUUID(),
    };

    const results = await Promise.all(Array.from({ length: 5 }, () => createContactAction(input)));

    expect(results.every((result) => result.ok)).toBe(true);
    const ids = results.flatMap((result) => (result.ok ? [result.data.id] : []));
    expect(new Set(ids).size).toBe(1);
    await expect(
      prisma.contactRequest.count({
        where: {
          workspaceId: fixture!.workspaceId,
          senderId: fixture!.buyer.userId,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    ).resolves.toBe(1);
  });

  it('creates one audit when identical moderation requests arrive concurrently', async () => {
    mocks.principal = fixture!.manager;
    const input = {
      targetUserId: fixture!.seller.userId,
      action: 'SUSPEND' as const,
      reason: 'Concurrent policy review for an isolated integration test.',
      expectedStatus: 'ACTIVE' as const,
      expectedAffectedAssets: 1,
    };

    const results = await Promise.all(
      Array.from({ length: 5 }, () => moderateParticipantAction(input)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    await expect(
      prisma.moderationAction.count({
        where: { workspaceId: fixture!.workspaceId, targetUserId: fixture!.seller.userId },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.user.findUnique({ where: { id: fixture!.seller.userId }, select: { status: true } }),
    ).resolves.toMatchObject({ status: 'SUSPENDED' });
  });

  it('computes the moderation preview from current server state', async () => {
    mocks.principal = fixture!.manager;
    const input = { targetUserId: fixture!.seller.userId, action: 'SUSPEND' as const };

    await expect(previewModerationAction(input)).resolves.toMatchObject({
      ok: true,
      data: { currentStatus: 'ACTIVE', affectedAssets: 1 },
    });
    await prisma.asset.create({
      data: {
        workspaceId: fixture!.workspaceId,
        sellerId: fixture!.seller.userId,
        title: 'Second Concurrency Test Asset',
        normalizedTitle: 'second concurrency test asset',
        summary: 'A second fictional Asset used to verify a fresh server-side impact preview.',
        description:
          'This second fictional Asset proves the moderation preview reads current database state.',
        category: 'PAYMENT',
        countryCode: 'GB',
        businessStatus: 'ACTIVE',
        askingPriceEur: 500_000,
        highlights: ['Fictional', 'Current'],
      },
    });

    await expect(previewModerationAction(input)).resolves.toMatchObject({
      ok: true,
      data: { currentStatus: 'ACTIVE', affectedAssets: 2 },
    });
  });

  it('keeps removal terminal when a restore action is forged', async () => {
    mocks.principal = fixture!.manager;
    await prisma.user.update({
      where: { id: fixture!.seller.userId },
      data: { status: 'REMOVED' },
    });

    const result = await moderateParticipantAction({
      targetUserId: fixture!.seller.userId,
      action: 'RESTORE',
      reason: 'A forged restore attempt against a terminally removed participant.',
      expectedStatus: 'REMOVED',
      expectedAffectedAssets: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    await expect(
      prisma.user.findUnique({ where: { id: fixture!.seller.userId }, select: { status: true } }),
    ).resolves.toMatchObject({ status: 'REMOVED' });
    await expect(
      prisma.moderationAction.count({
        where: { workspaceId: fixture!.workspaceId, targetUserId: fixture!.seller.userId },
      }),
    ).resolves.toBe(0);
  });

  it('rejects confirmation when the reviewed Asset count becomes stale', async () => {
    mocks.principal = fixture!.manager;
    await prisma.asset.create({
      data: {
        workspaceId: fixture!.workspaceId,
        sellerId: fixture!.seller.userId,
        title: 'Late Concurrency Test Asset',
        normalizedTitle: 'late concurrency test asset',
        summary: 'A late fictional Asset added after the manager reviewed moderation impact.',
        description:
          'This fictional Asset verifies that moderation cannot apply against a stale impact preview.',
        category: 'FINTECH',
        countryCode: 'PL',
        businessStatus: 'ACTIVE',
        askingPriceEur: 700_000,
        highlights: ['Fictional', 'Late'],
      },
    });

    const result = await moderateParticipantAction({
      targetUserId: fixture!.seller.userId,
      action: 'SUSPEND',
      reason: 'Attempting confirmation against a deliberately stale impact preview.',
      expectedStatus: 'ACTIVE',
      expectedAffectedAssets: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'STALE_MODERATION_PREVIEW' });
    await expect(
      prisma.user.findUnique({ where: { id: fixture!.seller.userId }, select: { status: true } }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      prisma.moderationAction.count({
        where: { workspaceId: fixture!.workspaceId, targetUserId: fixture!.seller.userId },
      }),
    ).resolves.toBe(0);
  });

  it('classifies a changed participant status as a stale preview', async () => {
    mocks.principal = fixture!.manager;
    await prisma.user.update({
      where: { id: fixture!.seller.userId },
      data: { status: 'SUSPENDED' },
    });

    const result = await moderateParticipantAction({
      targetUserId: fixture!.seller.userId,
      action: 'SUSPEND',
      reason: 'Attempting confirmation after another manager changed participant status.',
      expectedStatus: 'ACTIVE',
      expectedAffectedAssets: 1,
    });

    expect(result).toMatchObject({ ok: false, code: 'STALE_MODERATION_PREVIEW' });
    await expect(
      prisma.moderationAction.count({
        where: { workspaceId: fixture!.workspaceId, targetUserId: fixture!.seller.userId },
      }),
    ).resolves.toBe(0);
  });
});
