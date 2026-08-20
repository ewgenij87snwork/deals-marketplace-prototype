import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  DEMO_MODE_ENABLED: z.enum(['true', 'false']).default('true'),
  MAX_DEMO_WORKSPACES: z.coerce.number().int().positive().max(200).default(40),
  VERCEL_GIT_COMMIT_SHA: z.string().default('local'),
});

export function getServerEnv() {
  return schema.parse(process.env);
}
