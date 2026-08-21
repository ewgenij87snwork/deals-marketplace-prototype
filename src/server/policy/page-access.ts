import 'server-only';

import { redirect } from 'next/navigation';
import type { UserRole } from '@/generated/prisma/enums';
import { requireActive, requireRole, type Principal } from '@/server/policy/authorization';
import { AppPolicyError } from '@/server/policy/errors';
import { requirePrincipal } from '@/server/session/signed-session';

export async function requirePageAccess(...roles: UserRole[]): Promise<Principal> {
  try {
    const principal = await requirePrincipal();
    if (roles.length > 0) requireRole(principal, ...roles);
    else requireActive(principal);
    return principal;
  } catch (error) {
    if (!(error instanceof AppPolicyError)) throw error;
    if (error.code === 'AUTH_REQUIRED') redirect('/?notice=session');
    if (error.code === 'PARTICIPANT_SUSPENDED') redirect('/?notice=suspended');
    if (error.code === 'RESOURCE_REMOVED') redirect('/?notice=removed');
    if (error.code === 'ROLE_FORBIDDEN') redirect('/dashboard?notice=role');
    throw error;
  }
}
