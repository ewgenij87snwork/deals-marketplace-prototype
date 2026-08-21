'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionResult } from '@/domain/contracts/action-result';
import { switchPersona } from '@/server/demo/switch-persona';
import { toActionError } from '@/server/policy/errors';

const roleSchema = z.enum(['BUYER', 'SELLER', 'PLATFORM_MANAGER']);
export async function switchPersonaAction(
  formData: FormData,
): Promise<ActionResult<{ switched: true }>> {
  try {
    await switchPersona(roleSchema.parse(formData.get('role')));
  } catch (error) {
    return toActionError(error);
  }
  redirect('/dashboard');
}
