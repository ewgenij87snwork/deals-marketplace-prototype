import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { assetQuerySchema } from '@/domain/validation';
import { requirePrincipal } from '@/server/session/signed-session';
import { listAssets } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';

const categories = ['BANK', 'FINTECH', 'PAYMENT', 'EMI', 'CRYPTO'] as const;
const businessStatuses = [
  'ACTIVE',
  'LICENSE_ONLY',
  'PRE_REVENUE',
  'DORMANT',
  'PROFITABLE',
] as const;

const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;

export default async function BuyerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'BUYER');
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
  const { q, category, country, businessStatus, page } = parsed.data;
  const data = await listAssets(principal, { q, category, country, businessStatus, page });
  return (
    <AppShell principal={principal} title="Explore Assets" eyebrow="Buyer / marketplace">
      <form className="search-bar">
        <input name="q" defaultValue={q} placeholder="Search title or description" />
        <select aria-label="Category" defaultValue={category ?? ''} name="category">
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          aria-label="Country"
          defaultValue={country ?? ''}
          maxLength={2}
          name="country"
          placeholder="Country code"
        />
        <select
          aria-label="Business status"
          defaultValue={businessStatus ?? ''}
          name="businessStatus"
        >
          <option value="">All statuses</option>
          {businessStatuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button className="button primary">Search</button>
      </form>
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
      {data.assets.length === 0 && (
        <div className="empty">No matches. Try clearing your search.</div>
      )}
    </AppShell>
  );
}
