export type BuyerCriteria = {
  budgetMinEur: number;
  budgetMaxEur: number;
  targetCountries: string[];
  targetCategories: string[];
  targetLicenseTypes: string[];
  targetBusinessStatuses: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
};

export type MatchableAsset = {
  askingPriceEur: number;
  countryCode: string;
  category: string;
  licenseType: string | null;
  businessStatus: string;
  employeeCount: number | null;
};

type Outcome = 'match' | 'partial' | 'gap' | 'unknown';
export type MatchReason = {
  dimension: string;
  outcome: Outcome;
  label: string;
  weight: number;
  awarded: number;
};
export type MatchResult = {
  fitScore: number;
  confidence: number;
  reasons: MatchReason[];
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function calculateMatch(criteria: BuyerCriteria, asset: MatchableAsset): MatchResult {
  const reasons: MatchReason[] = [];
  const add = (
    dimension: string,
    configured: boolean,
    weight: number,
    outcome: Outcome,
    label: string,
    factor: number,
  ) => {
    if (configured) reasons.push({ dimension, outcome, label, weight, awarded: weight * factor });
  };

  const budgetConfigured = criteria.budgetMaxEur > 0;
  const inBudget =
    asset.askingPriceEur >= criteria.budgetMinEur && asset.askingPriceEur <= criteria.budgetMaxEur;
  const nearBudget =
    budgetConfigured &&
    !inBudget &&
    asset.askingPriceEur >= criteria.budgetMinEur * 0.75 &&
    asset.askingPriceEur <= criteria.budgetMaxEur * 1.25;
  add(
    'budget',
    budgetConfigured,
    30,
    inBudget ? 'match' : nearBudget ? 'partial' : 'gap',
    inBudget
      ? 'Asking price fits the mandate'
      : nearBudget
        ? 'Asking price is close to the mandate'
        : 'Asking price is outside the mandate',
    inBudget ? 1 : nearBudget ? 0.5 : 0,
  );

  const exact = (dimension: string, values: string[], actual: string, weight: number) => {
    const configured = values.length > 0;
    const matched = values.includes(actual);
    add(
      dimension,
      configured,
      weight,
      matched ? 'match' : 'gap',
      matched ? `${dimension} matches the mandate` : `${dimension} is outside the mandate`,
      matched ? 1 : 0,
    );
  };
  exact('country', criteria.targetCountries, asset.countryCode, 20);
  exact('category', criteria.targetCategories, asset.category, 20);
  exact('business status', criteria.targetBusinessStatuses, asset.businessStatus, 10);

  const licenses = criteria.targetLicenseTypes.map(normalize).filter(Boolean);
  const actualLicense = normalize(asset.licenseType ?? '');
  const licenseConfigured = licenses.length > 0;
  const licenseMatched =
    actualLicense.length > 0 &&
    licenses.some((value) => actualLicense.includes(value) || value.includes(actualLicense));
  add(
    'license',
    licenseConfigured,
    15,
    actualLicense.length === 0 ? 'unknown' : licenseMatched ? 'match' : 'gap',
    actualLicense.length === 0
      ? 'Licence is not disclosed'
      : licenseMatched
        ? 'Licence interest matches'
        : 'Licence is outside the mandate',
    licenseMatched ? 1 : 0,
  );

  const employeesConfigured = criteria.minEmployees !== null || criteria.maxEmployees !== null;
  const employeesMatched =
    asset.employeeCount !== null &&
    (criteria.minEmployees === null || asset.employeeCount >= criteria.minEmployees) &&
    (criteria.maxEmployees === null || asset.employeeCount <= criteria.maxEmployees);
  add(
    'team size',
    employeesConfigured,
    5,
    asset.employeeCount === null ? 'unknown' : employeesMatched ? 'match' : 'gap',
    asset.employeeCount === null
      ? 'Team size is not disclosed'
      : employeesMatched
        ? 'Team size fits'
        : 'Team size is outside the mandate',
    employeesMatched ? 1 : 0,
  );

  const configuredWeight = reasons.reduce((sum, reason) => sum + reason.weight, 0);
  const awarded = reasons.reduce((sum, reason) => sum + reason.awarded, 0);

  return {
    fitScore: configuredWeight ? percent((awarded / configuredWeight) * 100) : 0,
    confidence: percent(configuredWeight),
    reasons: reasons.sort((a, b) => b.awarded - a.awarded || b.weight - a.weight),
  };
}
