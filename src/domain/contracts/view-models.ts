export type MatchReasonVM = {
  dimension: string;
  outcome: 'match' | 'partial' | 'gap' | 'unknown';
  label: string;
};
export type MatchVM = { fitScore: number; confidence: number; reasons: MatchReasonVM[] };

export type AssetCardVM = {
  id: string;
  title: string;
  summary: string;
  category: string;
  countryCode: string;
  businessStatus: string;
  askingPriceEur: number;
  seller: { id: string; organization: string };
  match?: MatchVM;
};

export type BuyerCardVM = {
  id: string;
  name: string;
  organization: string;
  countryCode: string;
  thesis: string;
  match?: MatchVM;
};
