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
    page?: number;
  } = {},
) {
  const q = params.q?.trim() ?? '';
  const where = {
    workspaceId: principal.workspaceId,
    seller: { status: 'ACTIVE' as const },
    ...(params.category ? { category: params.category as never } : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.businessStatus ? { businessStatus: params.businessStatus as never } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { summary: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const total = await prisma.asset.count({ where });
  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: ((params.page ?? 1) - 1) * pageSize,
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
  });
  const profile =
    principal.role === 'BUYER'
      ? await prisma.buyerProfile.findUnique({
          where: { userId: principal.userId },
          select: buyerProfileSelect,
        })
      : null;
  return {
    assets: assets.map((asset) => ({
      ...asset,
      seller: { id: asset.seller.id, organization: asset.seller.organization },
      match: profile ? calculateMatch(profile, asset) : undefined,
    })),
    total,
    pageSize,
  };
}

export async function getAssetDetail(principal: Principal, assetId: string) {
  const asset = await prisma.asset.findFirst({
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
  });
  if (!asset || (principal.role !== 'PLATFORM_MANAGER' && asset.seller.status !== 'ACTIVE'))
    return null;
  const profile =
    principal.role === 'BUYER'
      ? await prisma.buyerProfile.findUnique({
          where: { userId: principal.userId },
          select: buyerProfileSelect,
        })
      : null;
  return { ...asset, match: profile ? calculateMatch(profile, asset) : undefined };
}

export async function listOwnAssets(principal: Principal) {
  return prisma.asset.findMany({
    where: { workspaceId: principal.workspaceId, sellerId: principal.userId },
    orderBy: { createdAt: 'desc' },
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
  const buyers = await prisma.user.findMany({
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
    select: {
      id: true,
      name: true,
      organization: true,
      countryCode: true,
      profileSummary: true,
      buyerProfile: { select: buyerProfileSelect },
    },
  });
  let selectedAsset = null;
  if (params.selectedAssetId)
    selectedAsset = await prisma.asset.findFirst({
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
    });
  return {
    buyers: buyers.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
      organization: buyer.organization,
      countryCode: buyer.countryCode,
      thesis: buyer.buyerProfile?.investmentThesis ?? buyer.profileSummary,
      match:
        selectedAsset && buyer.buyerProfile
          ? calculateMatch(buyer.buyerProfile, selectedAsset)
          : undefined,
    })),
    selectedAsset,
  };
}

export async function listParticipants(
  principal: Principal,
  params: { q?: string; role?: 'BUYER' | 'SELLER'; status?: string; country?: string } = {},
) {
  return prisma.user.findMany({
    where: {
      workspaceId: principal.workspaceId,
      AND: [{ role: { not: 'PLATFORM_MANAGER' } }, ...(params.role ? [{ role: params.role }] : [])],
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' } },
              { organization: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { organization: 'asc' }],
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
  });
}

export async function listManagerAssets(
  principal: Principal,
  params: { q?: string; status?: string; category?: string } = {},
) {
  return prisma.asset.findMany({
    where: {
      workspaceId: principal.workspaceId,
      ...(params.category ? { category: params.category as never } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' } },
              { seller: { organization: { contains: params.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      countryCode: true,
      askingPriceEur: true,
      seller: { select: { organization: true, status: true } },
    },
  });
}

export async function listContacts(principal: Principal) {
  return prisma.contactRequest.findMany({
    where: {
      workspaceId: principal.workspaceId,
      OR: [{ senderId: principal.userId }, { recipientId: principal.userId }],
    },
    orderBy: { createdAt: 'desc' },
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
