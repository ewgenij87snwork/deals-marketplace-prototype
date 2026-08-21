import 'server-only';

import type { UserRole } from '@/generated/prisma/enums';
import { prisma } from '@/server/db/prisma';
import { AppPolicyError } from '@/server/policy/errors';
import { parseSessionToken, setDemoSession } from '@/server/session/signed-session';
import { cookies } from 'next/headers';
import { provisionDemoWorkspace } from './provision-workspace';

const COOKIE = 'n5deal_demo';

async function findPersona(workspaceId: string, role: UserRole) {
  return prisma.user.findFirst({
    where: {
      workspaceId,
      role,
      status: 'ACTIVE',
      workspace: { expiresAt: { gt: new Date() } },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
}

export async function switchPersona(role: UserRole): Promise<void> {
  const current = (await cookies()).get(COOKIE)?.value;
  const parsed = current ? parseSessionToken(current) : null;
  let workspaceId = parsed?.workspaceId;
  let persona = workspaceId ? await findPersona(workspaceId, role) : null;

  if (!workspaceId || !persona) {
    workspaceId = (await provisionDemoWorkspace()).workspaceId;
    persona = await findPersona(workspaceId, role);
  }

  if (!persona) {
    throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Demo persona not found.');
  }
  await setDemoSession(workspaceId, persona.id);
}
