import { describe, expect, it } from 'vitest';
import {
  buyerProfileInputSchema,
  publishAssetInputSchema,
  smartAssetWarnings,
  smartBuyerWarnings,
} from './validation';

describe('marketplace validation', () => {
  it('rejects an inverted Buyer budget', () => {
    const result = buyerProfileInputSchema.safeParse({
      investmentThesis: 'A'.repeat(50),
      budgetMinEur: 2_000_000,
      budgetMaxEur: 500_000,
      targetCountries: ['GB'],
      targetCategories: [],
      targetLicenseTypes: [],
      targetBusinessStatuses: [],
      minEmployees: null,
      maxEmployees: null,
    });

    expect(result.success).toBe(false);
  });

  it('normalizes empty optional form fields to null', () => {
    const result = publishAssetInputSchema.parse({
      title: 'UK payment institution',
      summary: 'A'.repeat(80),
      description: 'B'.repeat(100),
      category: 'PAYMENT',
      countryCode: 'gb',
      licenseType: '',
      regulator: '',
      businessStatus: 'ACTIVE',
      askingPriceEur: 1_000_000,
      employeeCount: '',
      highlights: ['Fictional demo fact 1', 'Fictional demo fact 2'],
    });

    expect(result).toMatchObject({
      countryCode: 'GB',
      licenseType: null,
      regulator: null,
      employeeCount: null,
    });
  });

  it('rejects a zero asking price for a published Asset', () => {
    const result = publishAssetInputSchema.safeParse({
      title: 'UK payment institution',
      summary: 'A'.repeat(80),
      description: 'B'.repeat(100),
      category: 'PAYMENT',
      countryCode: 'GB',
      licenseType: 'FCA PI',
      regulator: 'Financial Conduct Authority',
      businessStatus: 'ACTIVE',
      askingPriceEur: 0,
      employeeCount: 12,
      highlights: ['Fictional demo fact 1', 'Fictional demo fact 2'],
    });

    expect(result.success).toBe(false);
  });

  it('warns about an active regulated listing without team or licence detail', () => {
    const input = publishAssetInputSchema.parse({
      title: 'UK payment institution',
      summary: 'A'.repeat(50),
      description: 'B'.repeat(100),
      category: 'PAYMENT',
      countryCode: 'GB',
      licenseType: null,
      regulator: null,
      businessStatus: 'ACTIVE',
      askingPriceEur: 1_000_000,
      employeeCount: 0,
      highlights: ['Fictional demo fact 1', 'Fictional demo fact 2'],
    });
    const warnings = smartAssetWarnings(input);

    expect(warnings.map((item) => item.code)).toEqual(
      expect.arrayContaining(['ACTIVE_WITHOUT_TEAM', 'LICENSE_MISSING']),
    );
  });

  it('suggests narrowing an overly broad Buyer mandate', () => {
    const input = buyerProfileInputSchema.parse({
      investmentThesis: 'A'.repeat(110),
      budgetMinEur: 100_000,
      budgetMaxEur: 5_000_000,
      targetCountries: ['GB'],
      targetCategories: ['FINTECH'],
      targetLicenseTypes: [],
      targetBusinessStatuses: [],
      minEmployees: null,
      maxEmployees: null,
    });

    expect(smartBuyerWarnings(input).map((item) => item.code)).toContain('BUDGET_TOO_BROAD');
  });

  it('does not warn solely because a valid mandate rationale is concise', () => {
    const input = buyerProfileInputSchema.parse({
      investmentThesis: 'Acquire a licensed payment business with a proven operating model.',
      budgetMinEur: 300_000,
      budgetMaxEur: 2_000_000,
      targetCountries: ['GB', 'LT'],
      targetCategories: ['PAYMENT'],
      targetLicenseTypes: ['EMI'],
      targetBusinessStatuses: ['ACTIVE'],
      minEmployees: 2,
      maxEmployees: 25,
    });

    expect(smartBuyerWarnings(input)).toEqual([]);
  });
});
