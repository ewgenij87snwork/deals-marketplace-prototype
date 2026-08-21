// @vitest-environment node

import 'dotenv/config';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db/prisma';
import { provisionDemoWorkspace } from '@/server/demo/provision-workspace';

const originalCapacity = process.env.MAX_DEMO_WORKSPACES;
const createdWorkspaceIds = new Set<string>();

describe('demo workspace capacity', () => {
  afterEach(async () => {
    if (createdWorkspaceIds.size > 0) {
      await prisma.demoWorkspace.deleteMany({ where: { id: { in: [...createdWorkspaceIds] } } });
      createdWorkspaceIds.clear();
    }
    if (originalCapacity === undefined) delete process.env.MAX_DEMO_WORKSPACES;
    else process.env.MAX_DEMO_WORKSPACES = originalCapacity;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('admits exactly one workspace when one capacity slot remains under concurrency', async () => {
    const now = new Date();
    const baseline = await prisma.demoWorkspace.count({ where: { expiresAt: { gt: now } } });
    expect(baseline).toBeLessThan(200);
    process.env.MAX_DEMO_WORKSPACES = String(baseline + 1);

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => provisionDemoWorkspace()),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') createdWorkspaceIds.add(result.value.workspaceId);
    }

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === 'rejected')
        .every(
          (result) =>
            result.status === 'rejected' &&
            typeof result.reason === 'object' &&
            result.reason !== null &&
            'code' in result.reason &&
            result.reason.code === 'DEMO_CAPACITY_REACHED',
        ),
    ).toBe(true);
  });
});
