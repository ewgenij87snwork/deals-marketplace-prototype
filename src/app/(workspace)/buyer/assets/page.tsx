import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { MarketplaceFilters } from '@/components/marketplace-filters';
import { Pagination } from '@/components/pagination';
import { assetQuerySchema } from '@/domain/validation';
import { requirePageAccess } from '@/server/policy/page-access';
import { optionalQueryValue } from '@/server/http/query-value';
import { listAssets } from '@/server/queries/marketplace';

export default async function BuyerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePageAccess('BUYER');
  const params = await searchParams;
  const parsed = assetQuerySchema.safeParse({
    q: params.q ?? '',
    category: optionalQueryValue(params.category),
    country: optionalQueryValue(params.country),
    businessStatus: optionalQueryValue(params.businessStatus),
    priceMin: optionalQueryValue(params.priceMin),
    priceMax: optionalQueryValue(params.priceMax),
    page: optionalQueryValue(params.page),
  });
  if (!parsed.success) redirect('/buyer/assets');
  const { q, category, country, businessStatus, priceMin, priceMax, page } = parsed.data;
  const data = await listAssets(principal, {
    q,
    category,
    country,
    businessStatus,
    priceMin,
    priceMax,
    page,
  });
  const suggestions = {
    countries: [...new Set(data.assets.map((asset) => asset.countryCode))].sort(),
    queries: [...new Set(data.assets.map((asset) => asset.title))].sort(),
  };
  return (
    <>
      <PageHeader title="Explore Assets" eyebrow="Buyer / marketplace" />
      <MarketplaceFilters suggestions={suggestions} />
      <div className="card-grid">
        {data.assets.map((asset) => (
          <Link
            className="market-card interactive-market-card"
            href={`/assets/${asset.id}`}
            key={asset.id}
          >
            <div className="card-top">
              <span className="tag">{asset.category}</span>
              <span className="price">€{asset.askingPriceEur.toLocaleString()}</span>
            </div>
            <h2>{asset.title}</h2>
            <p>{asset.summary}</p>
            <small>
              {asset.countryCode} · {asset.businessStatus} · {asset.seller.organization}
            </small>
            {asset.match && (
              <div className="match">
                <strong>
                  {asset.match.fitScore}% Smart Match
                  <span className="method-badge" title="Deterministic rules; no live AI is used.">
                    Rule-based
                  </span>
                </strong>
                <span>{asset.match.reasons[0]?.label}</span>
              </div>
            )}
            <span className="text-link">Inspect opportunity →</span>
          </Link>
        ))}
      </div>
      {data.assets.length === 0 && data.inventoryTotal === 0 && (
        <div className="empty">No Assets are currently available in this demo workspace.</div>
      )}
      {data.assets.length === 0 && data.inventoryTotal > 0 && (
        <div className="empty">
          No matches. <Link href="/buyer/assets">Clear all filters</Link>.
        </div>
      )}
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        params={{ q, category, country, businessStatus, priceMin, priceMax }}
        pathname="/buyer/assets"
        total={data.total}
      />
    </>
  );
}
