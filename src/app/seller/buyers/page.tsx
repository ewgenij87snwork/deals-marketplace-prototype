import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ContactForm } from '@/components/marketplace-forms';
import { participantQuerySchema } from '@/domain/validation';
import { requirePrincipal } from '@/server/session/signed-session';
import { listBuyers, listOwnAssets } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';

const sellerBuyerQuerySchema = participantQuerySchema.pick({ q: true, country: true });
const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;

export default async function SellerBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'SELLER');
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
  return (
    <AppShell principal={principal} title="Find Buyers" eyebrow="Seller / matching">
      <form className="search-bar">
        <input name="q" defaultValue={q} placeholder="Search Buyers" />
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
          defaultValue={country ?? ''}
          maxLength={2}
          name="country"
          placeholder="Buyer country"
        />
        <button className="button primary">Apply filters</button>
      </form>
      {data.selectedAsset && (
        <p className="notice success">Matching Buyers against {data.selectedAsset.title}.</p>
      )}
      <div className="card-grid">
        {data.buyers.map((buyer) => (
          <article className="market-card" key={buyer.id}>
            <span className="tag">Buyer · {buyer.countryCode}</span>
            <h2>{buyer.organization}</h2>
            <p>{buyer.thesis}</p>
            {buyer.match && (
              <div className="match">
                <strong>{buyer.match.fitScore}% Smart Match</strong>
                <span>{buyer.match.reasons[0]?.label}</span>
              </div>
            )}
            <details>
              <summary>Contact Buyer</summary>
              <ContactForm recipientId={buyer.id} assetId={data.selectedAsset?.id} />
            </details>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
