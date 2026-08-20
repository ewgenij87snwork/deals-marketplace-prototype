import 'server-only';

import { getServerEnv } from '@/config/env';
import { prisma } from '@/server/db/prisma';
import { AppPolicyError } from '@/server/policy/errors';
import { addHours } from '@/server/time';
import { buyerProfiles, demoAssets, demoUsers } from './fixture-data';

const normalize = (value: string) => value.trim().toLowerCase();

export async function provisionDemoWorkspace() {
  const env = getServerEnv();
  if (env.DEMO_MODE_ENABLED !== 'true') {
    throw new AppPolicyError('AUTH_REQUIRED', 'The public demo is closed.');
  }

  const now = new Date();
  await prisma.demoWorkspace.deleteMany({ where: { expiresAt: { lte: now } } });
  const activeCount = await prisma.demoWorkspace.count({ where: { expiresAt: { gt: now } } });
  if (activeCount >= env.MAX_DEMO_WORKSPACES) {
    throw new AppPolicyError(
      'DEMO_CAPACITY_REACHED',
      'The public demo is temporarily at capacity.',
    );
  }

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.demoWorkspace.create({
      data: { expiresAt: addHours(now, 24) },
    });
    const ids = new Map<string, string>();

    for (const user of demoUsers) {
      const created = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          role: user.role,
          status: 'ACTIVE',
          name: user.name,
          organization: user.organization,
          email: user.email,
          normalizedEmail: normalize(user.email),
          countryCode: user.countryCode,
          profileSummary: user.profileSummary,
        },
      });
      ids.set(user.key, created.id);
    }

    for (const profile of buyerProfiles) {
      await tx.buyerProfile.create({
        data: {
          userId: ids.get(profile.userKey)!,
          investmentThesis: profile.investmentThesis,
          budgetMinEur: profile.budgetMinEur,
          budgetMaxEur: profile.budgetMaxEur,
          targetCountries: [...profile.targetCountries],
          targetCategories: [...profile.targetCategories],
          targetLicenseTypes: [...profile.targetLicenseTypes],
          targetBusinessStatuses: [...profile.targetBusinessStatuses],
          minEmployees: profile.minEmployees,
          maxEmployees: profile.maxEmployees,
        },
      });
    }

    for (const asset of demoAssets) {
      await tx.asset.create({
        data: {
          workspaceId: workspace.id,
          sellerId: ids.get(asset.sellerKey)!,
          title: asset.title,
          normalizedTitle: normalize(asset.title),
          summary: asset.summary,
          description: asset.description,
          category: asset.category,
          countryCode: asset.countryCode,
          licenseType: asset.licenseType,
          regulator: asset.regulator,
          businessStatus: asset.businessStatus,
          askingPriceEur: asset.askingPriceEur,
          employeeCount: asset.employeeCount,
          highlights: [...asset.highlights],
        },
      });
    }

    return { workspaceId: workspace.id, personaIds: ids };
  });
}
