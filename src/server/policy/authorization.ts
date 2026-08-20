import type { ParticipantStatus, UserRole } from '@/generated/prisma/enums';
import { AppPolicyError } from './errors';

export type Principal = {
  workspaceId: string;
  userId: string;
  role: UserRole;
  status: ParticipantStatus;
};

export function requireActive(principal: Principal): void {
  if (principal.status === 'SUSPENDED')
    throw new AppPolicyError('PARTICIPANT_SUSPENDED', 'This demo participant is suspended.');
  if (principal.status === 'REMOVED')
    throw new AppPolicyError('RESOURCE_REMOVED', 'This demo participant was removed.');
}

export function requireRole(principal: Principal, ...roles: UserRole[]): void {
  requireActive(principal);
  if (!roles.includes(principal.role))
    throw new AppPolicyError('ROLE_FORBIDDEN', 'This action is not available for the active role.');
}

export function requireSameWorkspace(principal: Principal, workspaceId: string): void {
  if (principal.workspaceId !== workspaceId)
    throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Resource not found.');
}
