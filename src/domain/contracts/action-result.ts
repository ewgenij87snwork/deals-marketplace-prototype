import type { AppErrorCode } from '@/server/policy/errors';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> };
