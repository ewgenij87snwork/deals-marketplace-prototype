import { NextResponse } from 'next/server';
import { getServerEnv } from '@/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = getServerEnv();
  try {
    const { prisma } = await import('@/server/db/prisma');
    // Exercise an application table as well as the database connection.
    await prisma.asset.findFirst({ select: { id: true } });
    return NextResponse.json(
      {
        status: 'ok',
        database: 'reachable',
        service: 'deals-marketplace-prototype',
        sha: env.VERCEL_GIT_COMMIT_SHA,
        time: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unreachable',
        service: 'deals-marketplace-prototype',
        sha: env.VERCEL_GIT_COMMIT_SHA,
        time: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
