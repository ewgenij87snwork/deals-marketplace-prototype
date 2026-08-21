// @vitest-environment node

import 'dotenv/config';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Principal } from '@/server/policy/authorization';
import { prisma } from '@/server/db/prisma';
import { listManagerAssets, listParticipants } from '@/server/queries/marketplace';

let workspaceId: string | null = null;
let manager: Principal | null = null;

describe('bounded manager directories', () => {
  beforeEach(async () => {
    const workspace = await prisma.demoWorkspace.create({
      data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    workspaceId = workspace.id;
    const [managerUser, seller] = await Promise.all([
      prisma.user.create({
        data: {
          workspaceId,
          role: 'PLATFORM_MANAGER',
          name: 'Paging Manager',
          organization: 'Paging Manager Org',
          email: 'paging-manager@example.test',
          normalizedEmail: 'paging-manager@example.test',
          countryCode: 'GB',
        },
      }),
      prisma.user.create({
        data: {
          workspaceId,
          role: 'SELLER',
          name: 'Paging Seller',
          organization: 'Paging Seller Org',
          email: 'paging-seller@example.test',
          normalizedEmail: 'paging-seller@example.test',
          countryCode: 'GB',
        },
      }),
    ]);
    manager = {
      workspaceId,
      userId: managerUser.id,
      role: managerUser.role,
      status: managerUser.status,
    };
    await prisma.user.createMany({
      data: Array.from({ length: 13 }, (_, index) => ({
        workspaceId: workspace.id,
        role: 'BUYER' as const,
        name: `Paging Buyer ${index}`,
        organization: `Paging Buyer Org ${index}`,
        email: `paging-buyer-${index}@example.test`,
        normalizedEmail: `paging-buyer-${index}@example.test`,
        countryCode: 'GB',
      })),
    });
    await prisma.asset.createMany({
      data: Array.from({ length: 15 }, (_, index) => ({
        workspaceId: workspace.id,
        sellerId: seller.id,
        title: `Paging Asset ${index}`,
        normalizedTitle: `paging asset ${index}`,
        summary: 'A fictional Asset created to verify bounded Manager directory pagination.',
        description:
          'This isolated fictional Asset exists only for a bounded-query integration contract and is deleted after the test.',
        category: 'PAYMENT' as const,
        countryCode: 'GB',
        businessStatus: 'ACTIVE' as const,
        askingPriceEur: 500_000 + index,
        highlights: ['Fictional', 'Paginated'],
      })),
    });
  });

  afterEach(async () => {
    if (workspaceId) await prisma.demoWorkspace.deleteMany({ where: { id: workspaceId } });
    workspaceId = null;
    manager = null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bounds and counts Manager Assets across pages', async () => {
    const first = await listManagerAssets(manager!, { page: 1 });
    const second = await listManagerAssets(manager!, { page: 2 });

    expect(first).toMatchObject({ total: 15, pageSize: 12 });
    expect(first.assets).toHaveLength(12);
    expect(second.assets).toHaveLength(3);
  });

  it('bounds and counts Manager participants across pages', async () => {
    const first = await listParticipants(manager!, { page: 1 });
    const second = await listParticipants(manager!, { page: 2 });

    expect(first).toMatchObject({ total: 14, pageSize: 12 });
    expect(first.people).toHaveLength(12);
    expect(second.people).toHaveLength(2);
  });
});
