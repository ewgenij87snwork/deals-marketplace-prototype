import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { MarketplaceFilters } from '@/components/marketplace-filters';
import { Pagination } from '@/components/pagination';
import { assetQuerySchema } from '@/domain/validation';
import { requirePageAccess } from '@/server/policy/page-access';
import { listAssets } from '@/server/queries/marketplace';

const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;

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
    <AppShell principal={principal} title="Explore Assets" eyebrow="Buyer / marketplace">
      <MarketplaceFilters suggestions={suggestions} />
      <div className="card-grid">
        {data.assets.map((asset) => (
          <article className="market-card" key={asset.id}>
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
                <strong>{asset.match.fitScore}% Smart Match</strong>
                <span>{asset.match.reasons[0]?.label}</span>
              </div>
            )}
            <Link className="text-link" href={`/assets/${asset.id}`}>
              Inspect opportunity →
            </Link>
          </article>
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
    </AppShell>
  );
}
