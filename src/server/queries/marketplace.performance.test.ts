// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Principal } from '@/server/policy/authorization';

const mocks = vi.hoisted(() => ({
  assetCount: vi.fn(),
  assetFindMany: vi.fn(),
  assetFindFirst: vi.fn(),
  buyerProfileFindUnique: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock('@/server/db/prisma', () => ({
  prisma: {
    asset: {
      count: (...args: unknown[]) => mocks.assetCount(...args),
      findMany: (...args: unknown[]) => mocks.assetFindMany(...args),
      findFirst: (...args: unknown[]) => mocks.assetFindFirst(...args),
    },
    buyerProfile: {
      findUnique: (...args: unknown[]) => mocks.buyerProfileFindUnique(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mocks.userFindMany(...args),
    },
  },
}));

import { getAssetDetail, listAssets, listBuyers } from './marketplace';

const buyer: Principal = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  role: 'BUYER',
  status: 'ACTIVE',
};

describe('asset directory query timing', () => {
  beforeEach(() => {
    mocks.assetCount.mockReset();
    mocks.assetFindMany.mockReset();
    mocks.assetFindFirst.mockReset();
    mocks.buyerProfileFindUnique.mockReset();
    mocks.userFindMany.mockReset();
  });

  it('starts the Buyer profile lookup while the Asset directory is still loading', async () => {
    mocks.assetCount.mockResolvedValue(1);
    mocks.buyerProfileFindUnique.mockResolvedValue(null);
    let resolveAssets: (value: unknown[]) => void = () => undefined;
    mocks.assetFindMany.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveAssets = resolve;
        }),
    );

    const result = listAssets(buyer);
    await Promise.resolve();

    expect(mocks.buyerProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: buyer.userId },
      select: expect.any(Object),
    });

    resolveAssets([
      {
        id: 'asset-id',
        title: 'Parallel query proof',
        summary: 'A fictional Asset used to verify query scheduling.',
        category: 'PAYMENT',
        countryCode: 'GB',
        businessStatus: 'ACTIVE',
        askingPriceEur: 100,
        licenseType: null,
        employeeCount: null,
        seller: { id: 'seller-id', organization: 'Seller', status: 'ACTIVE' },
      },
    ]);

    await expect(result).resolves.toMatchObject({ total: 1, inventoryTotal: 1 });
  });

  it('starts the Buyer profile lookup while an Asset detail is still loading', async () => {
    mocks.buyerProfileFindUnique.mockResolvedValue(null);
    let resolveAsset: (value: unknown) => void = () => undefined;
    mocks.assetFindFirst.mockImplementation(
      () =>
        new Promise<unknown>((resolve) => {
          resolveAsset = resolve;
        }),
    );

    const result = getAssetDetail(buyer, '00000000-0000-4000-8000-000000000003');
    await Promise.resolve();

    expect(mocks.buyerProfileFindUnique).toHaveBeenCalledWith({
      where: { userId: buyer.userId },
      select: expect.any(Object),
    });

    resolveAsset(null);
    await expect(result).resolves.toBeNull();
  });

  it('starts the selected Asset lookup while Buyer matching records are still loading', async () => {
    let resolveBuyers: (value: unknown[]) => void = () => undefined;
    mocks.userFindMany.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveBuyers = resolve;
        }),
    );
    mocks.assetFindFirst.mockResolvedValue(null);

    const result = listBuyers(
      { ...buyer, role: 'SELLER' },
      { selectedAssetId: '00000000-0000-4000-8000-000000000004' },
    );
    await Promise.resolve();

    expect(mocks.assetFindFirst).toHaveBeenCalledTimes(1);

    resolveBuyers([]);
    await expect(result).resolves.toMatchObject({ buyers: [], selectedAsset: null });
  });
});
