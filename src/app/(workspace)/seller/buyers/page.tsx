import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { ContactForm } from '@/components/marketplace-forms';
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
      <UrlFilterForm>
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
        <button className="button primary">Apply filters</button>
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
        <p className="notice success">Matching Buyers against {data.selectedAsset.title}.</p>
      )}
      <div className="card-grid matching-card-grid">
        {data.buyers.map((buyer) => (
          <article className="market-card" key={buyer.id}>
            <span className="tag">Buyer · {buyer.countryCode}</span>
            <h2>{buyer.organization}</h2>
            <p>{buyer.thesis}</p>
            {buyer.match && (
              <div className="match">
                <strong>
                  {buyer.match.fitScore}% Smart Match
                  <span className="method-badge" title="Deterministic rules; no live AI is used.">
                    Rule-based
                  </span>
                </strong>
                <span>{buyer.match.reasons[0]?.label}</span>
              </div>
            )}
            <details name="buyer-contact">
              <summary>Contact Buyer</summary>
              <ContactForm recipientId={buyer.id} assetId={data.selectedAsset?.id} />
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
