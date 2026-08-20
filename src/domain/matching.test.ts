import { describe, expect, it } from 'vitest';
import { calculateMatch } from './matching';

const criteria = {
  budgetMinEur: 300_000,
  budgetMaxEur: 2_000_000,
  targetCountries: ['GB'],
  targetCategories: ['PAYMENT'],
  targetLicenseTypes: ['EMI'],
  targetBusinessStatuses: ['ACTIVE'],
  minEmployees: 2,
  maxEmployees: 25,
};

describe('calculateMatch', () => {
  it('returns an explainable high-confidence exact fit', () => {
    const result = calculateMatch(criteria, {
      askingPriceEur: 1_200_000,
      countryCode: 'GB',
      category: 'PAYMENT',
      licenseType: 'EMI',
      businessStatus: 'ACTIVE',
      employeeCount: 12,
    });

    expect(result.fitScore).toBe(100);
    expect(result.confidence).toBe(100);
    expect(result.reasons).toHaveLength(6);
  });

  it('does not present sparse criteria as high confidence', () => {
    const result = calculateMatch(
      {
        ...criteria,
        targetCountries: [],
        targetCategories: [],
        targetLicenseTypes: [],
        targetBusinessStatuses: [],
        minEmployees: null,
        maxEmployees: null,
      },
      {
        askingPriceEur: 1_200_000,
        countryCode: 'GB',
        category: 'PAYMENT',
        licenseType: 'EMI',
        businessStatus: 'ACTIVE',
        employeeCount: 12,
      },
    );

    expect(result.fitScore).toBe(100);
    expect(result.confidence).toBe(30);
  });

  it('does not match an undisclosed licence to every configured licence', () => {
    const result = calculateMatch(criteria, {
      askingPriceEur: 1_200_000,
      countryCode: 'GB',
      category: 'PAYMENT',
      licenseType: null,
      businessStatus: 'ACTIVE',
      employeeCount: 12,
    });

    expect(result.reasons.find((reason) => reason.dimension === 'license')).toMatchObject({
      outcome: 'unknown',
      awarded: 0,
    });
    expect(result.fitScore).toBeLessThan(100);
  });
});
