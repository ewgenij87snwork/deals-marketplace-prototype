export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'ROLE_FORBIDDEN'
  | 'PARTICIPANT_SUSPENDED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_REMOVED'
  | 'VALIDATION_FAILED'
  | 'DUPLICATE_ASSET_TITLE'
  | 'CONTACT_SELF'
  | 'CONTACT_TARGET_UNAVAILABLE'
  | 'STALE_MODERATION_PREVIEW'
  | 'DEMO_CAPACITY_REACHED';

export class AppPolicyError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function toActionError(error: unknown) {
  if (error instanceof AppPolicyError)
    return { ok: false as const, code: error.code, message: error.message };
  if (error instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join('.') || 'form';
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return {
      ok: false as const,
      code: 'VALIDATION_FAILED' as const,
      message: 'Please correct the highlighted fields.',
      fieldErrors,
    };
  }
  return {
    ok: false as const,
    code: 'VALIDATION_FAILED' as const,
    message: 'The action could not be completed. Please retry.',
  };
}
import { z } from 'zod';
