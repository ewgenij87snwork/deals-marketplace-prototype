import 'server-only';

import { prisma } from '@/server/db/prisma';
import { calculateMatch } from '@/domain/matching';
import type { Principal } from '@/server/policy/authorization';

const pageSize = 12;

const buyerProfileSelect = {
  investmentThesis: true,
  budgetMinEur: true,
  budgetMaxEur: true,
  targetCountries: true,
  targetCategories: true,
  targetLicenseTypes: true,
  targetBusinessStatuses: true,
  minEmployees: true,
  maxEmployees: true,
} as const;

export async function getBuyerProfile(principal: Principal) {
  const user = await prisma.user.findFirst({
    where: { id: principal.userId, workspaceId: principal.workspaceId },
    select: {
      id: true,
      name: true,
      organization: true,
      countryCode: true,
      buyerProfile: { select: buyerProfileSelect },
    },
  });
  return user;
}

export async function listAssets(
  principal: Principal,
  params: {
    q?: string;
    category?: string;
    country?: string;
    businessStatus?: string;
    priceMin?: number;
    priceMax?: number;
    page?: number;
  } = {},
) {
  const q = params.q?.trim() ?? '';
  const inventoryWhere = {
    workspaceId: principal.workspaceId,
    seller: { status: 'ACTIVE' as const },
  };
  const where = {
    ...inventoryWhere,
    ...(params.category ? { category: params.category as never } : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.businessStatus ? { businessStatus: params.businessStatus as never } : {}),
    ...(params.priceMin !== undefined || params.priceMax !== undefined
      ? {
          askingPriceEur: {
            ...(params.priceMin !== undefined ? { gte: params.priceMin } : {}),
            ...(params.priceMax !== undefined ? { lte: params.priceMax } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { summary: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const page = params.page ?? 1;
  const profile =
    principal.role === 'BUYER'
      ? prisma.buyerProfile.findUnique({
          where: { userId: principal.userId },
          select: buyerProfileSelect,
        })
      : Promise.resolve(null);
  const [total, inventoryTotal, assets, buyerProfile] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.count({ where: inventoryWhere }),
    prisma.asset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        countryCode: true,
        businessStatus: true,
        askingPriceEur: true,
        licenseType: true,
        employeeCount: true,
        seller: { select: { id: true, organization: true, status: true } },
      },
    }),
    profile,
  ]);
  return {
    assets: assets.map((asset) => ({
      ...asset,
      seller: { id: asset.seller.id, organization: asset.seller.organization },
      match: buyerProfile ? calculateMatch(buyerProfile, asset) : undefined,
    })),
    total,
    inventoryTotal,
    page,
    pageSize,
  };
}

export async function getAssetDetail(principal: Principal, assetId: string) {
  const profile =
    principal.role === 'BUYER'
      ? prisma.buyerProfile.findUnique({
          where: { userId: principal.userId },
          select: buyerProfileSelect,
        })
      : Promise.resolve(null);
  const [asset, buyerProfile] = await Promise.all([
    prisma.asset.findFirst({
      where: {
        id: assetId,
        workspaceId: principal.workspaceId,
        ...(principal.role === 'SELLER' ? { sellerId: principal.userId } : {}),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        description: true,
        category: true,
        countryCode: true,
        licenseType: true,
        regulator: true,
        businessStatus: true,
        askingPriceEur: true,
        employeeCount: true,
        highlights: true,
        seller: { select: { id: true, name: true, organization: true, status: true } },
      },
    }),
    profile,
  ]);
  if (!asset || (principal.role !== 'PLATFORM_MANAGER' && asset.seller.status !== 'ACTIVE'))
    return null;
  return { ...asset, match: buyerProfile ? calculateMatch(buyerProfile, asset) : undefined };
}

export async function listOwnAssets(principal: Principal) {
  return prisma.asset.findMany({
    where: { workspaceId: principal.workspaceId, sellerId: principal.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      title: true,
      category: true,
      countryCode: true,
      businessStatus: true,
      askingPriceEur: true,
      createdAt: true,
    },
  });
}

export async function listBuyers(
  principal: Principal,
  params: { q?: string; country?: string; selectedAssetId?: string } = {},
) {
  const q = params.q?.trim() ?? '';
  const selectedAsset = params.selectedAssetId
    ? prisma.asset.findFirst({
        where: {
          id: params.selectedAssetId,
          workspaceId: principal.workspaceId,
          sellerId: principal.userId,
        },
        select: {
          id: true,
          title: true,
          askingPriceEur: true,
          countryCode: true,
          category: true,
          licenseType: true,
          businessStatus: true,
          employeeCount: true,
        },
      })
    : Promise.resolve(null);
  const [buyers, matchingAsset] = await Promise.all([
    prisma.user.findMany({
      where: {
        workspaceId: principal.workspaceId,
        role: 'BUYER',
        status: 'ACTIVE',
        ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { organization: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { organization: 'asc' },
      take: 50,
      select: {
        id: true,
        name: true,
        organization: true,
        countryCode: true,
        profileSummary: true,
        buyerProfile: { select: buyerProfileSelect },
      },
    }),
    selectedAsset,
  ]);
  return {
    buyers: buyers.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
      organization: buyer.organization,
      countryCode: buyer.countryCode,
      thesis: buyer.buyerProfile?.investmentThesis ?? buyer.profileSummary,
      match:
        matchingAsset && buyer.buyerProfile
          ? calculateMatch(buyer.buyerProfile, matchingAsset)
          : undefined,
    })),
    selectedAsset: matchingAsset,
  };
}

export async function listParticipants(
  principal: Principal,
  params: {
    q?: string;
    role?: 'BUYER' | 'SELLER';
    status?: string;
    country?: string;
    page?: number;
  } = {},
) {
  const where = {
    workspaceId: principal.workspaceId,
    AND: [
      { role: { not: 'PLATFORM_MANAGER' as const } },
      ...(params.role ? [{ role: params.role }] : []),
    ],
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' as const } },
            { organization: { contains: params.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const page = params.page ?? 1;
  const [total, people] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ status: 'asc' }, { organization: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        organization: true,
        role: true,
        status: true,
        countryCode: true,
        profileSummary: true,
        _count: { select: { assets: true } },
      },
    }),
  ]);
  return { people, total, page, pageSize };
}

export async function listManagerAssets(
  principal: Principal,
  params: {
    q?: string;
    sellerStatus?: string;
    category?: string;
    country?: string;
    page?: number;
  } = {},
) {
  const q = params.q?.trim() ?? '';
  const where = {
    workspaceId: principal.workspaceId,
    ...(params.category ? { category: params.category as never } : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.sellerStatus ? { seller: { status: params.sellerStatus as never } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { summary: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
            { seller: { organization: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
  const page = params.page ?? 1;
  const [total, assets] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        countryCode: true,
        askingPriceEur: true,
        seller: { select: { organization: true, status: true } },
      },
    }),
  ]);
  return { assets, total, page, pageSize };
}

export async function listContacts(principal: Principal) {
  return prisma.contactRequest.findMany({
    where: {
      workspaceId: principal.workspaceId,
      OR: [{ senderId: principal.userId }, { recipientId: principal.userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      subject: true,
      message: true,
      createdAt: true,
      sender: { select: { id: true, name: true, organization: true } },
      recipient: { select: { id: true, name: true, organization: true } },
      asset: { select: { id: true, title: true } },
    },
  });
}
