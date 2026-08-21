import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ getServerEnv: () => ({ SESSION_SECRET: 'x'.repeat(48) }) }));
vi.mock('@/server/db/prisma', () => ({ prisma: {} }));

import { createSessionToken, parseSessionToken } from './signed-session';

describe('signed demo session', () => {
  beforeEach(() => vi.useRealTimers());
  it('round-trips an unexpired signed payload', () => {
    const payload = {
      workspaceId: crypto.randomUUID(),
      activeUserId: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    };
    expect(parseSessionToken(createSessionToken(payload))).toEqual(payload);
  });
  it('rejects tampering', () => {
    const token = createSessionToken({
      workspaceId: crypto.randomUUID(),
      activeUserId: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    });
    expect(parseSessionToken(`${token}x`)).toBeNull();
  });
  it('rejects tokens with trailing segments', () => {
    const token = createSessionToken({
      workspaceId: crypto.randomUUID(),
      activeUserId: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    });

    expect(parseSessionToken(`${token}.extra`)).toBeNull();
  });
});
