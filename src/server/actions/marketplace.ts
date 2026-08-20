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
  publishAssetInputSchema,
} from '@/domain/validation';
import type { ActionResult } from '@/domain/contracts/action-result';

const normalize = (value: string) => value.trim().toLowerCase();

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
    const existing = await prisma.contactRequest.findFirst({
      where: {
        workspaceId: principal.workspaceId,
        senderId: principal.userId,
        idempotencyKey: value.idempotencyKey,
      },
      select: { id: true },
    });
    if (existing) return { ok: true, data: { id: existing.id, duplicate: true } };
    const target = await prisma.user.findFirst({
      where: {
        id: value.recipientId,
        workspaceId: principal.workspaceId,
        status: 'ACTIVE',
        role: principal.role === 'BUYER' ? 'SELLER' : 'BUYER',
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
      const asset = await prisma.asset.findFirst({
        where: {
          id: assetId,
          workspaceId: principal.workspaceId,
          ...(principal.role === 'SELLER' ? { sellerId: principal.userId } : {}),
          seller: { status: 'ACTIVE' },
        },
        select: { id: true, sellerId: true },
      });
      if (!asset || (principal.role === 'BUYER' && asset.sellerId !== target.id))
        throw new AppPolicyError('RESOURCE_NOT_FOUND', 'The selected Asset is not available.');
      assetId = asset.id;
    }
    const contact = await prisma.contactRequest.create({
      data: {
        workspaceId: principal.workspaceId,
        senderId: principal.userId,
        recipientId: target.id,
        assetId,
        subject: value.subject,
        message: value.message,
        idempotencyKey: value.idempotencyKey,
      },
    });
    revalidatePath('/contacts');
    return { ok: true, data: { id: contact.id, duplicate: false } };
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
    const target = await prisma.user.findFirst({
      where: {
        id: value.targetUserId,
        workspaceId: principal.workspaceId,
        role: { not: 'PLATFORM_MANAGER' },
      },
      select: { id: true, status: true },
    });
    if (!target) throw new AppPolicyError('RESOURCE_NOT_FOUND', 'Participant not found.');
    const nextStatus =
      value.action === 'SUSPEND' ? 'SUSPENDED' : value.action === 'REMOVE' ? 'REMOVED' : 'ACTIVE';
    if (target.status === nextStatus)
      throw new AppPolicyError('VALIDATION_FAILED', 'This participant is already in that state.');
    const affectedAssets = await prisma.asset.count({
      where: { workspaceId: principal.workspaceId, sellerId: target.id },
    });
    const action = await prisma.$transaction(async (tx) => {
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
