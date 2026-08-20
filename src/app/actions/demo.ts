'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { switchPersona } from '@/server/demo/switch-persona';

const roleSchema = z.enum(['BUYER', 'SELLER', 'PLATFORM_MANAGER']);
export async function switchPersonaAction(formData: FormData) {
  await switchPersona(roleSchema.parse(formData.get('role')));
  redirect('/dashboard');
}
