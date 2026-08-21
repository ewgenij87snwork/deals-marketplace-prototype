import { z } from 'zod';
import { ASSET_CATEGORIES, BUSINESS_STATUSES, PARTICIPANT_STATUSES, USER_ROLES } from './taxonomy';

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/);
const uniqueStrings = z
  .array(z.string().trim().min(1).max(120))
  .max(20)
  .transform((values) => [...new Set(values)]);
const nullableInteger = (maximum: number) =>
  z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.coerce.number().int().min(0).max(maximum).nullable(),
  );
const nullableText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().min(2).max(maximum).nullable(),
  );

export const buyerProfileInputSchema = z
  .object({
    investmentThesis: z.string().trim().min(40).max(2000),
    budgetMinEur: z.coerce.number().int().min(0).max(1_000_000_000),
    budgetMaxEur: z.coerce.number().int().min(0).max(1_000_000_000),
    targetCountries: z.array(countryCode).max(20),
    targetCategories: z.array(z.enum(ASSET_CATEGORIES)).max(10),
    targetLicenseTypes: uniqueStrings,
    targetBusinessStatuses: z.array(z.enum(BUSINESS_STATUSES)).max(10),
    minEmployees: nullableInteger(100_000),
    maxEmployees: nullableInteger(100_000),
  })
  .superRefine((value, context) => {
    if (value.budgetMaxEur < value.budgetMinEur) {
      context.addIssue({
        code: 'custom',
        path: ['budgetMaxEur'],
        message: 'Maximum budget must be at least the minimum.',
      });
    }
    if (
      value.minEmployees !== null &&
      value.maxEmployees !== null &&
      value.maxEmployees < value.minEmployees
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxEmployees'],
        message: 'Maximum employees must be at least the minimum.',
      });
    }
    const hasStructuredCriteria = [
      value.targetCountries,
      value.targetCategories,
      value.targetLicenseTypes,
      value.targetBusinessStatuses,
    ].some((items) => items.length > 0);
    if (!hasStructuredCriteria) {
      context.addIssue({
        code: 'custom',
        path: ['targetCategories'],
        message: 'Add at least one structured acquisition criterion.',
      });
    }
  });

export const publishAssetInputSchema = z.object({
  title: z.string().trim().min(5).max(160),
  summary: z.string().trim().min(40).max(320),
  description: z.string().trim().min(80).max(5000),
  category: z.enum(ASSET_CATEGORIES),
  countryCode,
  licenseType: nullableText(120),
  regulator: nullableText(120),
  businessStatus: z.enum(BUSINESS_STATUSES),
  askingPriceEur: z.coerce.number().int().min(0).max(1_000_000_000),
  employeeCount: nullableInteger(100_000),
  highlights: uniqueStrings.pipe(z.array(z.string()).min(2).max(6)),
});

export const assetQuerySchema = z
  .object({
    q: z.string().trim().max(120).default(''),
    category: z.enum(ASSET_CATEGORIES).optional(),
    country: countryCode.optional(),
    businessStatus: z.enum(BUSINESS_STATUSES).optional(),
    priceMin: z.coerce.number().int().min(0).optional(),
    priceMax: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).max(100).default(1),
  })
  .superRefine((value, context) => {
    if (
      value.priceMin !== undefined &&
      value.priceMax !== undefined &&
      value.priceMax < value.priceMin
    ) {
      context.addIssue({
        code: 'custom',
        path: ['priceMax'],
        message: 'Maximum price must be at least the minimum.',
      });
    }
  });

export const participantQuerySchema = z.object({
  q: z.string().trim().max(120).default(''),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(PARTICIPANT_STATUSES).optional(),
  country: countryCode.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

export const contactInputSchema = z.object({
  recipientId: z.string().uuid(),
  assetId: z.string().uuid().nullable(),
  subject: z.string().trim().min(5).max(160),
  message: z.string().trim().min(20).max(2000),
  idempotencyKey: z.string().min(16).max(120),
});

export const moderationInputSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['SUSPEND', 'RESTORE', 'REMOVE']),
  reason: z.string().trim().min(12).max(500),
  expectedStatus: z.enum(PARTICIPANT_STATUSES),
  expectedAffectedAssets: z.number().int().min(0).max(100_000),
});

export const moderationPreviewInputSchema = moderationInputSchema.pick({
  targetUserId: true,
  action: true,
});

export type SmartIssue = {
  severity: 'warning' | 'suggestion';
  code: string;
  message: string;
  field?: string;
};

export function smartBuyerWarnings(input: z.infer<typeof buyerProfileInputSchema>): SmartIssue[] {
  const issues: SmartIssue[] = [];
  if (input.investmentThesis.length < 100) {
    issues.push({
      severity: 'suggestion',
      code: 'THESIS_THIN',
      field: 'investmentThesis',
      message: 'Add geography, target type, and the main investment rationale.',
    });
  }
  if (input.budgetMinEur > 0 && input.budgetMaxEur / input.budgetMinEur > 20) {
    issues.push({
      severity: 'warning',
      code: 'BUDGET_TOO_BROAD',
      field: 'budgetMaxEur',
      message: 'A narrower ticket range will produce more useful matches.',
    });
  }
  return issues;
}

export function smartAssetWarnings(input: z.infer<typeof publishAssetInputSchema>): SmartIssue[] {
  const issues: SmartIssue[] = [];
  if (input.summary.length < 80) {
    issues.push({
      severity: 'suggestion',
      code: 'SUMMARY_THIN',
      field: 'summary',
      message: 'Add concrete regulatory or commercial facts.',
    });
  }
  if (input.businessStatus === 'ACTIVE' && (input.employeeCount ?? 0) === 0) {
    issues.push({
      severity: 'warning',
      code: 'ACTIVE_WITHOUT_TEAM',
      field: 'employeeCount',
      message: 'Explain how an active operation works without a disclosed team.',
    });
  }
  if (!input.licenseType && ['BANK', 'PAYMENT', 'EMI', 'CRYPTO'].includes(input.category)) {
    issues.push({
      severity: 'warning',
      code: 'LICENSE_MISSING',
      field: 'licenseType',
      message: 'A regulated Asset should normally disclose its licence type.',
    });
  }
  return issues;
}
