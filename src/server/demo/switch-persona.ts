import 'server-only';

import type { UserRole } from '@/generated/prisma/enums';
import { prisma } from '@/server/db/prisma';
import { AppPolicyError } from '@/server/policy/errors';
import { parseSessionToken, setDemoSession } from '@/server/session/signed-session';
import { cookies } from 'next/headers';
import { provisionDemoWorkspace } from './provision-workspace';

const COOKIE = 'deals_demo';

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

async function findLatestContactRecipient(workspaceId: string, senderId: string, role: UserRole) {
  const contact = await prisma.contactRequest.findFirst({
    where: {
      workspaceId,
      senderId,
      recipient: { role, status: 'ACTIVE' },
    },
    orderBy: { createdAt: 'desc' },
    select: { recipient: { select: { id: true } } },
  });
  return contact?.recipient ?? null;
}

export async function switchPersona(role: UserRole): Promise<void> {
  const current = (await cookies()).get(COOKIE)?.value;
  const parsed = current ? parseSessionToken(current) : null;
  let workspaceId = parsed?.workspaceId;
  let persona =
    workspaceId && parsed?.activeUserId
      ? ((await findLatestContactRecipient(workspaceId, parsed.activeUserId, role)) ??
        (await findPersona(workspaceId, role)))
      : workspaceId
        ? await findPersona(workspaceId, role)
        : null;

  if (!workspaceId || !persona) {
    workspaceId = (await provisionDemoWorkspace()).workspaceId;
    persona = await findPersona(workspaceId, role);
  }

  if (!persona) {
    throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Demo persona not found.');
  }
  await setDemoSession(workspaceId, persona.id);
}
