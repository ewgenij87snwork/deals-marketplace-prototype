'use client';

import type { FeedbackState, ValidationIssue } from './form-primitives';

export const networkMessage = 'The server could not be reached. Check your connection and retry.';
export const defaultInquirySubject = 'Interest in your opportunity';
export const defaultInquiryMessage =
  'I would like to discuss this opportunity and understand the next steps.';

export const buyerInlineValidationFields = new Set([
  'budgetMinEur',
  'budgetMaxEur',
  'targetCountries',
  'targetCategories',
  'targetLicenseTypes',
  'targetBusinessStatuses',
  'minEmployees',
  'maxEmployees',
]);

export const publishInlineValidationFields = new Set([
  'countryCode',
  'askingPriceEur',
  'licenseType',
  'regulator',
  'employeeCount',
]);

export function fieldErrorsForIssues(
  issues: readonly ValidationIssue[],
  visibleFields: Set<string>,
) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? 'form');
    if (!visibleFields.has(field)) continue;
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function mergeFieldErrors(
  state: FeedbackState | null,
  clientErrors: Record<string, string[]>,
): FeedbackState | null {
  if (Object.keys(clientErrors).length === 0) return state;
  return {
    ...(state ?? { ok: false }),
    fieldErrors: { ...clientErrors, ...state?.fieldErrors },
  };
}

export function buyerInput(form: FormData) {
  return {
    investmentThesis: form.get('investmentThesis'),
    budgetMinEur: form.get('budgetMinEur'),
    budgetMaxEur: form.get('budgetMaxEur'),
    targetCountries: String(form.get('targetCountries') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetCategories: String(form.get('targetCategories') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetLicenseTypes: String(form.get('targetLicenseTypes') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetBusinessStatuses: String(form.get('targetBusinessStatuses') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    minEmployees: form.get('minEmployees'),
    maxEmployees: form.get('maxEmployees'),
  };
}

export function assetInput(form: FormData) {
  return {
    title: form.get('title'),
    summary: form.get('summary'),
    description: form.get('description'),
    category: form.get('category'),
    countryCode: form.get('countryCode'),
    licenseType: form.get('licenseType'),
    regulator: form.get('regulator'),
    businessStatus: form.get('businessStatus'),
    askingPriceEur: form.get('askingPriceEur'),
    employeeCount: form.get('employeeCount'),
    highlights: String(form.get('highlights') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };
}
