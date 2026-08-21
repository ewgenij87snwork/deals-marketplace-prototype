'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { requirePrincipal } from '@/server/session/signed-session';
import { requireRole } from '@/server/policy/authorization';
import { AppPolicyError, toActionError } from '@/server/policy/errors';
import {
  buyerProfileInputSchema,
  contactInputSchema,
  moderationInputSchema,
  moderationPreviewInputSchema,
  publishAssetInputSchema,
} from '@/domain/validation';
import type { ActionResult } from '@/domain/contracts/action-result';
import type { ParticipantStatus } from '@/generated/prisma/enums';

const normalize = (value: string) => value.trim().toLowerCase();
function nextParticipantStatus(
  currentStatus: ParticipantStatus,
  action: 'SUSPEND' | 'RESTORE' | 'REMOVE',
): ParticipantStatus {
  if (action === 'SUSPEND' && currentStatus === 'ACTIVE') return 'SUSPENDED';
  if (action === 'RESTORE' && currentStatus === 'SUSPENDED') return 'ACTIVE';
  if (action === 'REMOVE' && currentStatus !== 'REMOVED') return 'REMOVED';
  throw new AppPolicyError('VALIDATION_FAILED', 'This moderation transition is not available.');
}

export async function updateBuyerProfileAction(
  input: unknown,
): Promise<ActionResult<{ saved: true }>> {
  try {
    const principal = await requirePrincipal();
    requireRole(principal, 'BUYER');
    const value = buyerProfileInputSchema.parse(input);
    await prisma.buyerProfile.upsert({
      where: { userId: principal.userId },
      create: { userId: principal.userId, ...value },
      update: value,
    });
    revalidatePath('/buyer/profile');
    return { ok: true, data: { saved: true } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function publishAssetAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const principal = await requirePrincipal();
    requireRole(principal, 'SELLER');
    const value = publishAssetInputSchema.parse(input);
    const normalizedTitle = normalize(value.title);
    const duplicate = await prisma.asset.findFirst({
      where: { workspaceId: principal.workspaceId, sellerId: principal.userId, normalizedTitle },
    });
    if (duplicate)
      throw new AppPolicyError(
        'DUPLICATE_ASSET_TITLE',
        'You already have an Asset with this title.',
      );
    const asset = await prisma.asset.create({
      data: {
        workspaceId: principal.workspaceId,
        sellerId: principal.userId,
        normalizedTitle,
        ...value,
      },
    });
    revalidatePath('/seller/assets');
    revalidatePath('/buyer/assets');
    return { ok: true, data: { id: asset.id } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createContactAction(
  input: unknown,
): Promise<ActionResult<{ id: string; duplicate: boolean }>> {
  try {
    const principal = await requirePrincipal();
    requireRole(principal, 'BUYER', 'SELLER');
    const value = contactInputSchema.parse(input);
    if (value.recipientId === principal.userId)
      throw new AppPolicyError('CONTACT_SELF', 'You cannot contact yourself.');
    const contact = await prisma.$transaction(async (tx) => {
      const [firstUserId, secondUserId] = [principal.userId, value.recipientId].sort();
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "workspaceId" = ${principal.workspaceId}::uuid
          AND "id" IN (${firstUserId}::uuid, ${secondUserId}::uuid)
        ORDER BY "id"
        FOR UPDATE
      `;

      const sender = await tx.user.findFirst({
        where: {
          id: principal.userId,
          workspaceId: principal.workspaceId,
        },
        select: { id: true, role: true, status: true },
      });
      if (!sender)
        throw new AppPolicyError('AUTH_REQUIRED', 'The demo session is no longer valid.');
      requireRole(
        {
          workspaceId: principal.workspaceId,
          userId: sender.id,
          role: sender.role,
          status: sender.status,
        },
        'BUYER',
        'SELLER',
      );

      const existing = await tx.contactRequest.findFirst({
        where: {
          workspaceId: principal.workspaceId,
          senderId: sender.id,
          idempotencyKey: value.idempotencyKey,
        },
        select: { id: true },
      });
      if (existing) return { id: existing.id, duplicate: true };

      const target = await tx.user.findFirst({
        where: {
          id: value.recipientId,
          workspaceId: principal.workspaceId,
          status: 'ACTIVE',
          role: sender.role === 'BUYER' ? 'SELLER' : 'BUYER',
        },
        select: { id: true },
      });
      if (!target)
        throw new AppPolicyError(
          'CONTACT_TARGET_UNAVAILABLE',
          'This participant is no longer available.',
        );

      let assetId = value.assetId;
      if (assetId) {
        const asset = await tx.asset.findFirst({
          where: {
            id: assetId,
            workspaceId: principal.workspaceId,
            ...(sender.role === 'SELLER' ? { sellerId: sender.id } : {}),
            seller: { status: 'ACTIVE' },
          },
          select: { id: true, sellerId: true },
        });
        if (!asset || (sender.role === 'BUYER' && asset.sellerId !== target.id))
          throw new AppPolicyError('RESOURCE_NOT_FOUND', 'The selected Asset is not available.');
        assetId = asset.id;
      }

      const created = await tx.contactRequest.create({
        data: {
          workspaceId: principal.workspaceId,
          senderId: sender.id,
          recipientId: target.id,
          assetId,
          subject: value.subject,
          message: value.message,
          idempotencyKey: value.idempotencyKey,
        },
      });
      return { id: created.id, duplicate: false };
    });
    revalidatePath('/contacts');
    return { ok: true, data: contact };
  } catch (error) {
    return toActionError(error);
  }
}

export async function previewModerationAction(
  input: unknown,
): Promise<ActionResult<{ currentStatus: string; affectedAssets: number }>> {
  try {
    const principal = await requirePrincipal();
    requireRole(principal, 'PLATFORM_MANAGER');
    const value = moderationPreviewInputSchema.parse(input);
    if (value.targetUserId === principal.userId)
      throw new AppPolicyError('ROLE_FORBIDDEN', 'A manager cannot moderate their own account.');
    const target = await prisma.user.findFirst({
      where: {
        id: value.targetUserId,
        workspaceId: principal.workspaceId,
        role: { not: 'PLATFORM_MANAGER' },
      },
      select: { status: true, _count: { select: { assets: true } } },
    });
    if (!target) throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Participant not found.');
    nextParticipantStatus(target.status, value.action);
    return {
      ok: true,
      data: { currentStatus: target.status, affectedAssets: target._count.assets },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function moderateParticipantAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const principal = await requirePrincipal();
    requireRole(principal, 'PLATFORM_MANAGER');
    const value = moderationInputSchema.parse(input);
    if (value.targetUserId === principal.userId)
      throw new AppPolicyError('ROLE_FORBIDDEN', 'A manager cannot moderate their own account.');
    const action = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "workspaceId" = ${principal.workspaceId}::uuid
          AND "id" = ${value.targetUserId}::uuid
        FOR UPDATE
      `;
      const target = await tx.user.findFirst({
        where: {
          id: value.targetUserId,
          workspaceId: principal.workspaceId,
          role: { not: 'PLATFORM_MANAGER' },
        },
        select: { id: true, status: true },
      });
      if (!target) throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Participant not found.');
      const affectedAssets = await tx.asset.count({
        where: { workspaceId: principal.workspaceId, sellerId: target.id },
      });
      if (target.status !== value.expectedStatus || affectedAssets !== value.expectedAffectedAssets)
        throw new AppPolicyError(
          'STALE_MODERATION_PREVIEW',
          'Marketplace state changed. Review the updated impact before confirming again.',
        );
      const nextStatus = nextParticipantStatus(target.status, value.action);
      const updated = await tx.user.update({
        where: { id: target.id },
        data: { status: nextStatus },
      });
      const audit = await tx.moderationAction.create({
        data: {
          workspaceId: principal.workspaceId,
          managerId: principal.userId,
          targetUserId: target.id,
          action: value.action,
          reason: value.reason,
          previousStatus: target.status,
          nextStatus,
          affectedAssets,
        },
      });
      return { id: audit.id, status: updated.status };
    });
    revalidatePath('/manager/participants');
    revalidatePath('/buyer/assets');
    return { ok: true, data: action };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetDemoAction(): Promise<ActionResult<{ reset: true }>> {
  try {
    const principal = await requirePrincipal();
    await prisma.demoWorkspace.delete({ where: { id: principal.workspaceId } });
    return { ok: true, data: { reset: true } };
  } catch (error) {
    return toActionError(error);
  }
}
