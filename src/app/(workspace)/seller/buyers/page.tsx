import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { BuyerMatchGrid } from '@/components/buyer-match-card';
import { UrlFilterForm } from '@/components/url-filter-form';
import { participantQuerySchema } from '@/domain/validation';
import { requirePageAccess } from '@/server/policy/page-access';
import { listBuyers, listOwnAssets } from '@/server/queries/marketplace';

const sellerBuyerQuerySchema = participantQuerySchema.pick({ q: true, country: true });
const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;
export default async function SellerBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePageAccess('SELLER');
  const params = await searchParams;
  const parsed = sellerBuyerQuerySchema.safeParse({
    q: params.q ?? '',
    country: optionalQueryValue(params.country),
  });
  if (!parsed.success) redirect('/seller/buyers');
  const { q, country } = parsed.data;
  const assets = await listOwnAssets(principal);
  if (params.asset !== undefined && typeof params.asset !== 'string') redirect('/seller/buyers');
  const requestedAssetId =
    typeof params.asset === 'string' && params.asset ? params.asset : undefined;
  const selectedAssetId =
    assets.find((asset) => asset.id === requestedAssetId)?.id ?? assets.at(0)?.id;
  if (requestedAssetId && requestedAssetId !== selectedAssetId) redirect('/seller/buyers');
  const data = await listBuyers(principal, {
    q,
    country,
    selectedAssetId,
  });
  const countrySuggestions = [...new Set(data.buyers.map((buyer) => buyer.countryCode))].sort();
  const querySuggestions = [...new Set(data.buyers.map((buyer) => buyer.organization))].sort();
  return (
    <>
      <PageHeader title="Find Buyers" eyebrow="Seller / matching" />
      <UrlFilterForm className="search-bar buyer-matching-search-bar">
        <input
          aria-label="Search Buyers"
          autoComplete="off"
          defaultValue={q}
          list="buyer-query-suggestions"
          maxLength={120}
          name="q"
          placeholder="Search Buyers"
        />
        <select aria-label="Asset context" defaultValue={selectedAssetId ?? ''} name="asset">
          <option disabled value="">
            Select an Asset
          </option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.title}
            </option>
          ))}
        </select>
        <input
          aria-label="Buyer country"
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={country ?? ''}
          list="buyer-country-suggestions"
          maxLength={2}
          name="country"
          placeholder="Buyer country"
          pattern="[A-Za-z]{2}"
        />
        <datalist id="buyer-query-suggestions">
          {querySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="buyer-country-suggestions">
          {countrySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </UrlFilterForm>
      {data.selectedAsset && (
        <p aria-live="polite" className="notice match-context">
          Matching Buyers against <strong>{data.selectedAsset.title}</strong>. Scores use budget,
          geography, category, status, licence, and team-size criteria from each Buyer profile.
        </p>
      )}
      <div aria-live="polite" className="results-toolbar">
        <span>
          <strong>{data.buyers.length}</strong> active Buyers
        </span>
        <span className="results-sort">Sorted by best fit</span>
      </div>
      <BuyerMatchGrid assetId={data.selectedAsset?.id} buyers={data.buyers} />
    </>
  );
}
