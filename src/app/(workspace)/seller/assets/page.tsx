import { PageHeader } from '@/components/app-shell';
import Link from 'next/link';
import { requirePageAccess } from '@/server/policy/page-access';
import { listOwnAssets } from '@/server/queries/marketplace';
export default async function SellerAssetsPage() {
  const principal = await requirePageAccess('SELLER');
  const assets = await listOwnAssets(principal);
  return (
    <>
      <PageHeader title="My Assets" eyebrow="Seller / inventory" />
      <div className="card-grid">
        {assets.map((asset) => (
          <Link
            className="market-card interactive-market-card"
            href={`/assets/${asset.id}`}
            key={asset.id}
          >
            <span className="tag">{asset.category}</span>
            <h2>{asset.title}</h2>
            <p>
              {asset.countryCode} · {asset.businessStatus}
            </p>
            <strong>€{asset.askingPriceEur.toLocaleString()}</strong>
          </Link>
        ))}
      </div>
      {assets.length === 0 && (
        <div className="empty">
          <p>No Assets published yet.</p>
          <Link className="text-link" href="/seller/publish">
            Publish your first Asset
          </Link>
        </div>
      )}
    </>
  );
}
