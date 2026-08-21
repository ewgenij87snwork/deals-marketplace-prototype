import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getServerEnv } from '@/config/env';
import { prisma } from '@/server/db/prisma';
import type { Principal } from '@/server/policy/authorization';
import { AppPolicyError } from '@/server/policy/errors';

const COOKIE = 'n5deal_demo';
const payloadSchema = z.object({
  workspaceId: z.string().uuid(),
  activeUserId: z.string().uuid(),
  exp: z.number().int(),
});

type Payload = z.infer<typeof payloadSchema>;
const encode = (value: string) => Buffer.from(value).toString('base64url');
const sign = (body: string) =>
  createHmac('sha256', getServerEnv().SESSION_SECRET).update(body).digest();

export function createSessionToken(payload: Payload): string {
  const body = encode(JSON.stringify(payload));
  return `${body}.${sign(body).toString('base64url')}`;
}

export function parseSessionToken(token: string): Payload | null {
  const segments = token.split('.');
  if (segments.length !== 2) return null;
  const [body, encodedSignature] = segments;
  if (!body || !encodedSignature) return null;

  const signature = Buffer.from(encodedSignature, 'base64url');
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;

  try {
    const json = Buffer.from(body, 'base64url').toString('utf8');
    const payload = payloadSchema.parse(JSON.parse(json));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function setDemoSession(workspaceId: string, activeUserId: string): Promise<void> {
  const maxAge = 24 * 60 * 60;
  const token = createSessionToken({
    workspaceId,
    activeUserId,
    exp: Date.now() + maxAge * 1000,
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function clearDemoSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function requirePrincipal(): Promise<Principal> {
  const token = (await cookies()).get(COOKIE)?.value;
  const payload = token ? parseSessionToken(token) : null;
  if (!payload) {
    throw new AppPolicyError('AUTH_REQUIRED', 'Choose a demo persona to continue.');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.activeUserId,
      workspaceId: payload.workspaceId,
      workspace: { expiresAt: { gt: new Date() } },
    },
    select: { id: true, workspaceId: true, role: true, status: true },
  });
  if (!user) {
    throw new AppPolicyError('AUTH_REQUIRED', 'The demo session is no longer valid.');
  }

  return {
    workspaceId: user.workspaceId,
    userId: user.id,
    role: user.role,
    status: user.status,
  };
}
